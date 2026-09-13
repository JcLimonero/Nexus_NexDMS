import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ScopeEnum } from '../../users/entities/user.entity';
import { ACCESS_COOKIE, leerCookie } from '../../../common/auth/cookies';

export interface UserPayload {
  sub: string;
  tenantId: string;
  branchId: string;
  legalEntityId: string;
  roles: string[];
  scope: ScopeEnum;
  /** true = administrador del SaaS (tabla admin_users), sin tenant. */
  admin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      // Se prioriza el header Authorization: Bearer y, si no está, la cookie
      // httpOnly de sesión. El orden importa en el mismo origen (app web): el
      // monitor del taller manda su token por Bearer y así gana aunque la cookie
      // del DMS "se cuele" en la petición; la sesión normal (sin Bearer) usa la
      // cookie. El fallback deja convivir apps migradas y no migradas.
      jwtFromRequest: (req: Request): string | null =>
        ExtractJwt.fromAuthHeaderAsBearerToken()(req) ??
        leerCookie(req, ACCESS_COOKIE) ??
        null,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: UserPayload): UserPayload {
    // Los administradores del SaaS no tienen tenant; los usuarios de tenant sí.
    if (!payload.sub || (!payload.tenantId && !payload.admin)) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
