import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { ApiKeyGuard } from '../security/api-key.guard';
import { CurrentTenant } from '../security/tenant.decorator';
import { SendOtpDto, VerifyOtpDto } from './otp.dto';
import { OtpService } from './otp.service';
@Controller('otp')
@UseGuards(ApiKeyGuard)
export class OtpController {
  constructor(private readonly otp: OtpService) {}
  @Post('send') send(@CurrentTenant() tenant: Tenant, @Body() dto: SendOtpDto) { return this.otp.send(tenant, dto); }
  @Post('verify') verify(@CurrentTenant() tenant: Tenant, @Body() dto: VerifyOtpDto) { return this.otp.verify(tenant, dto); }
}
