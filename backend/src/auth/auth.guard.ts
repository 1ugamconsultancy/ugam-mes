import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { ROLES_KEY, UserRole } from './roles.decorator';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer \S+$/.test(header)) throw new UnauthorizedException('Authentication required');
    req.user = await this.auth.authenticateToken(header.slice(7));
    const operational = !['AuthController', 'EnterpriseController'].includes(context.getClass().name);
    if (operational && !req.user.plantId) throw new ForbiddenException('Select an active plant');
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles && req.user.role !== 'SUPER_ADMIN' && !roles.includes(req.user.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
