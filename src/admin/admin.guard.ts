import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const supplied = context.switchToHttp().getRequest<{ headers: Record<string, string> }>().headers['x-admin-key'] ?? '';
    const expected = process.env.ADMIN_KEY ?? '';
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Invalid admin key');
    return true;
  }
}
