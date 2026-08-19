import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClientPortalService, PortalSession } from './client-portal.service';

interface RequestConSesion extends Request {
  portalSession?: PortalSession;
}

/**
 * Sesión del cliente en el portal.
 *
 * Va aparte del guard del back office porque son dos poblaciones distintas:
 * el token del portal solo abre datos del propio cliente, y el del personal
 * no sirve aquí. La separación se comprueba en `sesionDesdeToken`.
 */
@Injectable()
export class PortalSessionGuard implements CanActivate {
  constructor(private readonly portal: ClientPortalService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    const header = req.headers.authorization ?? '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta la sesión del portal');
    }
    req.portalSession = await this.portal.sesionDesdeToken(token);
    return true;
  }
}

/** Inyecta la sesión ya verificada en el método del controlador. */
export const CurrentPortalSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PortalSession => {
    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    if (!req.portalSession) {
      throw new UnauthorizedException('Sesión del portal no resuelta');
    }
    return req.portalSession;
  },
);
