import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    const userRole = (user.role || '').toLowerCase();

    // Platform super admins can access any endpoint
    if (['super_admin', 'superadmin'].includes(userRole)) {
      return true;
    }

    const hasRole = requiredRoles.some((r) => {
      const target = r.toLowerCase();
      if (target === 'driver') {
        return userRole === 'driver' || Boolean(user.isDriver);
      }
      if (target === 'web_admin') {
        if (user.isSaasAdmin) return true;
        // Allow any Web Admin / Staff user while blocking mobile-only merchant & driver accounts
        if (userRole === 'merchant') return false;
        if (userRole === 'driver' && !user.isStaff) return false;
        return true;
      }
      return target === userRole;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ៖ តួនាទី "${user.role}" មិនមានសិទ្ធិចូលដំណើរការ API នេះទេ`,
      );
    }

    return true;
  }
}
