import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../infra/prisma.service';
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; tenant?: unknown }>();
    const raw = request.headers['x-api-key'];
    if (!raw || raw.length < 24) throw new UnauthorizedException('Invalid API key');
    const digest = createHmac('sha256', process.env.API_KEY_PEPPER ?? '').update(raw).digest('hex');
    const candidates = await this.prisma.apiKey.findMany({ where: { prefix: raw.slice(0, 8), active: true, tenant: { active: true } }, include: { tenant: true } });
    const key = candidates.find((candidate) => {
      const a = Buffer.from(candidate.keyHash, 'hex');
      const b = Buffer.from(digest, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    });
    if (!key) throw new UnauthorizedException('Invalid API key');
    request.tenant = key.tenant;
    void this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return true;
  }
}
