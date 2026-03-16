import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import type { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UserPayload } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

const REFRESH_KEY_PREFIX = 'refresh:';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail('', dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const now = new Date();
    if (user.blockedUntil && user.blockedUntil > now) {
      throw new UnauthorizedException('Account blocked');
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException('Account blocked');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      user.loginAttempts += 1;
      await this.usersService.save(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.totpEnabled) {
      if (!dto.totpCode) {
        return {
          requiresTotp: true,
          message: 'Se requiere código de autenticación en dos pasos',
        };
      }
      if (!user.totpSecret) {
        throw new UnauthorizedException('TOTP no configurado correctamente');
      }
      const isValid = authenticator.verify({
        token: dto.totpCode,
        secret: user.totpSecret,
      });
      if (!isValid) {
        throw new UnauthorizedException('Código de autenticación inválido');
      }
    }

    user.loginAttempts = 0;
    user.lastLoginAt = now;
    await this.usersService.save(user);

    const payload: UserPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      brandId: user.brandId,
      role: user.role,
      scope: user.scope,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId },
      {
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    await this.redis.setex(
      `${REFRESH_KEY_PREFIX}${user.id}`,
      REFRESH_TTL_SECONDS,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        scope: user.scope,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; tenantId: string }>(
        refreshToken,
        { secret: this.config.get('JWT_SECRET') },
      );
      const userId = payload.sub;
      const tenantId = payload.tenantId;
      const stored = await this.redis.get(`${REFRESH_KEY_PREFIX}${userId}`);
      if (!stored) {
        throw new UnauthorizedException('Session expired');
      }
      const user = await this.usersService.findOneOrFail(userId, tenantId);
      const accessPayload: UserPayload = {
        sub: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        brandId: user.brandId,
        role: user.role,
        scope: user.scope,
      };
      const accessToken = this.jwtService.sign(accessPayload);
      return { accessToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Session expired');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`${REFRESH_KEY_PREFIX}${userId}`);
  }

  async changePassword(user: UserPayload, dto: ChangePasswordDto): Promise<void> {
    const dbUser = await this.usersService.findOneOrFail(user.sub, user.tenantId);
    const valid = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    dbUser.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    dbUser.passwordChangedAt = new Date();
    await this.usersService.save(dbUser);
  }

  async getMe(user: UserPayload) {
    const dbUser = await this.usersService.findOneOrFail(user.sub, user.tenantId);
    return {
      id: dbUser.id,
      tenantId: dbUser.tenantId,
      branchId: dbUser.branchId,
      brandId: dbUser.brandId,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      email: dbUser.email,
      role: dbUser.role,
      scope: dbUser.scope,
    };
  }
}
