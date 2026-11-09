import { Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../infra/prisma.service';
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  async dashboard() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [tenants, otp24h, verified24h, gst24h] = await Promise.all([
      this.prisma.tenant.count({ where: { active: true } }),
      this.prisma.otpEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.otpEvent.count({ where: { createdAt: { gte: since }, status: 'VERIFIED' } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since }, action: 'GST_LOOKUP' } }),
    ]);
    return { tenants, otp24h, verified24h, gst24h, providers: { whatsapp: (process.env.PROVIDER_MODE ?? 'mock') === 'live' ? 'live' : 'mock', gst: process.env.GST_API_KEY ? 'configured' : 'not_configured' } };
  }
  tenants() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { apiKeys: true, otpEvents: true } } } });
  }
  async createTenant(name: string) {
    const tenant = await this.prisma.tenant.create({ data: { name } });
    const key = await this.createApiKey(tenant.id);
    return { tenant, ...key };
  }
  async createApiKey(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const rawKey = `vrf_live_${randomBytes(24).toString('hex')}`;
    const record = await this.prisma.apiKey.create({ data: { tenantId, name: 'Dashboard generated', prefix: rawKey.slice(0, 8), keyHash: createHmac('sha256', process.env.API_KEY_PEPPER ?? '').update(rawKey).digest('hex') } });
    return { apiKey: rawKey, keyId: record.id, warning: 'Copy this key now. It will not be shown again.' };
  }
  audit() {
    return this.prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { tenant: { select: { name: true } } } });
  }
}
