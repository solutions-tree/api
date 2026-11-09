import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { ApiKeyGuard } from '../security/api-key.guard';
import { CurrentTenant } from '../security/tenant.decorator';
import { GstService } from './gst.service';
@Controller('gst')
@UseGuards(ApiKeyGuard)
export class GstController {
  constructor(private readonly gst: GstService) {}
  @Get(':gstin') lookup(@CurrentTenant() tenant: Tenant, @Param('gstin') gstin: string) { return this.gst.lookup(tenant, gstin); }
}
