import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ScopeEnum } from '../../users/entities/user.entity';

export interface UserPayload {
  sub: string;
  tenantId: string;
  branchId: string;
  legalEntityId: string;
  roles: string[];
  scope: ScopeEnum;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: UserPayload): UserPayload {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
