import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UserPayload } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Solo administradores de PLATAFORMA (tabla admin_users; token con `admin:true`)
 * pasan. Blinda los módulos del SaaS (saas, tenants, provisioning,
 * master-catalogs) contra un usuario de tenant que tuviera el rol string
 * "SUPERADMIN": ese rol por sí solo ya no basta para tocar la plataforma.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: UserPayload }>();
    const user = req.user;
    if (!user?.admin) {
      throw new ForbiddenException(
        'Solo el administrador de la plataforma puede acceder a este recurso',
      );
    }
    return true;
  }
}
