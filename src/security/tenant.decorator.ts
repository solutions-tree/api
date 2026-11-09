import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '@prisma/client';
export const CurrentTenant = createParamDecorator((_data: unknown, context: ExecutionContext): Tenant =>
  context.switchToHttp().getRequest<{ tenant: Tenant }>().tenant,
);
