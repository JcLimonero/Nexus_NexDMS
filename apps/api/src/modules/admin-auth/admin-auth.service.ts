import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AdminUser } from './entities/admin-user.entity';
import { ScopeEnum } from '../users/entities/user.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Autenticación del portal de administración del SaaS. Es independiente del
 * login de los tenants: valida contra admin_users y emite un token marcado
 * como `admin` (sin tenant). Los guards de los endpoints admin lo aceptan por
 * el rol SUPERADMIN que lleva el token.
 */
@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: { email: string; password: string }) {
    const admin = await this.adminRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    const now = new Date();
    if (admin.blockedUntil && admin.blockedUntil > now) {
      throw new UnauthorizedException('Cuenta bloqueada');
    }

    const ok = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!ok) {
      admin.loginAttempts += 1;
      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.adminRepo.save(admin);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    admin.loginAttempts = 0;
    admin.blockedUntil = null;
    admin.lastLoginAt = now;
    await this.adminRepo.save(admin);

    const payload: UserPayload = {
      sub: admin.id,
      admin: true,
      tenantId: '',
      branchId: '',
      legalEntityId: '',
      roles: ['SUPERADMIN'],
      scope: ScopeEnum.GLOBAL,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        roles: ['SUPERADMIN'],
      },
    };
  }
}
