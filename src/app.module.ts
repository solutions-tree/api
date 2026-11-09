import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaService } from './infra/prisma.service';
import { RedisService } from './infra/redis.service';
import { ApiKeyGuard } from './security/api-key.guard';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { MessageProvider } from './providers/message.provider';
import { GstController } from './gst/gst.controller';
import { GstService } from './gst/gst.service';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminGuard } from './admin/admin.guard';
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, OtpController, GstController, AdminController],
  providers: [PrismaService, RedisService, ApiKeyGuard, OtpService, MessageProvider, GstService, AdminService, AdminGuard],
})
export class AppModule {}
