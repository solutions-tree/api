import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
@Injectable()
export class GstService {
  constructor(private readonly redis: RedisService, private readonly prisma: PrismaService) {}
  async lookup(tenant: Tenant, input: string) {
    const gstin = input.trim().toUpperCase();
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) throw new BadRequestException('Invalid GSTIN format');
    const cacheKey = `gst:${gstin}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return { source: 'cache', data: JSON.parse(cached) as unknown };
    const baseUrl = process.env.GST_API_BASE_URL;
    const apiKey = process.env.GST_API_KEY;
    if (!baseUrl || !apiKey) throw new BadGatewayException('GST provider is not configured');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/taxpayer/${gstin}`, { headers: { 'x-api-key': apiKey }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new BadGatewayException('GST provider rejected the lookup');
    const data = await response.json();
    await this.redis.client.set(cacheKey, JSON.stringify(data), 'EX', 86400);
    await this.prisma.auditLog.create({ data: { tenantId: tenant.id, action: 'GST_LOOKUP', metadata: { gstinTail: gstin.slice(-4) } } });
    return { source: 'provider', data };
  }
}
