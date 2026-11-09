import { PrismaClient } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
const prisma = new PrismaClient();
async function main() {
  const rawKey = `vrf_live_${randomBytes(24).toString('hex')}`;
  const tenant = await prisma.tenant.create({ data: { name: process.env.SEED_TENANT_NAME ?? 'Demo Company' } });
  await prisma.apiKey.create({ data: { tenantId: tenant.id, name: 'Default', prefix: rawKey.slice(0, 8), keyHash: createHmac('sha256', process.env.API_KEY_PEPPER ?? '').update(rawKey).digest('hex') } });
  console.log(`Tenant: ${tenant.id}`);
  console.log(`API key (shown once): ${rawKey}`);
}
main().finally(() => prisma.$disconnect());
