import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { OtpChannel, OtpStatus, Tenant } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { MessageProvider } from '../providers/message.provider';
import { SendOtpDto, VerifyOtpDto } from './otp.dto';

@Injectable()
export class OtpService {
  private readonly ttlSeconds = 300;
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService, private readonly messages: MessageProvider) {}

  async send(tenant: Tenant, dto: SendOtpDto) {
    const destination = dto.destination.replace(/[\s-]/g, '');
    const destinationHash = this.hash(destination);
    await this.enforceLimit(`otp:send:${tenant.id}:${destinationHash}`, 5, 3600);
    await this.enforceLimit(`otp:tenant:${tenant.id}`, 1000, 3600);
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const event = await this.prisma.otpEvent.create({ data: { tenantId: tenant.id, destinationHash, destinationTail: destination.slice(-4), purpose: dto.purpose, channel: dto.channel as OtpChannel, expiresAt } });
    const code = randomInt(100000, 1000000).toString();
    await this.redis.client.set(`otp:code:${event.id}`, this.otpHash(event.id, code), 'EX', this.ttlSeconds);
    try {
      const delivery = await this.messages.sendOtp(dto.channel, destination, code);
      await this.prisma.otpEvent.update({ where: { id: event.id }, data: { providerRef: delivery.providerRef } });
    } catch (error) {
      await this.redis.client.del(`otp:code:${event.id}`);
      await this.prisma.otpEvent.update({ where: { id: event.id }, data: { status: OtpStatus.DELIVERY_FAILED } });
      throw error;
    }
    return { requestId: event.id, status: 'PENDING', expiresInSeconds: this.ttlSeconds, destination: `******${destination.slice(-4)}` };
  }

  async verify(tenant: Tenant, dto: VerifyOtpDto) {
    const event = await this.prisma.otpEvent.findFirst({ where: { id: dto.requestId, tenantId: tenant.id } });
    if (!event) throw new NotFoundException('OTP request not found');
    if (event.status === OtpStatus.VERIFIED) return { verified: true, requestId: event.id };
    if (event.status !== OtpStatus.PENDING) throw new BadRequestException(`OTP is ${event.status.toLowerCase()}`);
    if (event.expiresAt <= new Date()) {
      await this.prisma.otpEvent.update({ where: { id: event.id }, data: { status: OtpStatus.EXPIRED } });
      throw new BadRequestException('OTP expired');
    }
    const attempts = await this.redis.client.incr(`otp:attempts:${event.id}`);
    if (attempts === 1) await this.redis.client.expire(`otp:attempts:${event.id}`, this.ttlSeconds);
    if (attempts > 5) {
      await this.prisma.otpEvent.update({ where: { id: event.id }, data: { status: OtpStatus.LOCKED, attempts } });
      await this.redis.client.del(`otp:code:${event.id}`);
      throw new HttpException('OTP locked after too many attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
    const stored = await this.redis.client.get(`otp:code:${event.id}`);
    if (!stored) throw new BadRequestException('OTP expired');
    const actual = Buffer.from(this.otpHash(event.id, dto.code), 'hex');
    const expected = Buffer.from(stored, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      await this.prisma.otpEvent.update({ where: { id: event.id }, data: { attempts } });
      throw new BadRequestException('Invalid OTP');
    }
    await this.prisma.$transaction([
      this.prisma.otpEvent.update({ where: { id: event.id }, data: { status: OtpStatus.VERIFIED, verifiedAt: new Date(), attempts } }),
      this.prisma.auditLog.create({ data: { tenantId: tenant.id, action: 'OTP_VERIFIED', subjectId: event.id } }),
    ]);
    await this.redis.client.del(`otp:code:${event.id}`, `otp:attempts:${event.id}`);
    return { verified: true, requestId: event.id };
  }

  private hash(value: string) { return createHmac('sha256', process.env.OTP_PEPPER ?? '').update(value).digest('hex'); }
  private otpHash(id: string, code: string) { return this.hash(`${id}:${code}`); }
  private async enforceLimit(key: string, maximum: number, seconds: number) {
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, seconds);
    if (count > maximum) throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
}
