import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { CreateTenantDto } from './admin.dto';
import { AdminService } from './admin.service';
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('tenants') tenants() { return this.admin.tenants(); }
  @Post('tenants') createTenant(@Body() dto: CreateTenantDto) { return this.admin.createTenant(dto.name); }
  @Post('tenants/:id/keys') createKey(@Param('id') id: string) { return this.admin.createApiKey(id); }
  @Get('audit') audit() { return this.admin.audit(); }
}
