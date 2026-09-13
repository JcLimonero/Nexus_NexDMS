import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AdminUser } from './entities/admin-user.entity';
import { ScopeEnum } from '../users/entities/user.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { EmailjsService } from '../../common/email/emailjs.service';
import { EmailComposer } from '../../common/email/email-composer.service';
import { emailButton } from '../../common/email/templates';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { ResetUserType } from '../password-reset/password-reset-token.entity';

const MAX_LOGIN_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;

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
    private readonly config: ConfigService,
    private readonly reset: PasswordResetService,
    private readonly emailjs: EmailjsService,
    private readonly composer: EmailComposer,
  ) {}

  /** Solicita recuperación de contraseña del portal admin (respuesta genérica). */
  async forgotPassword(dto: { email: string }): Promise<{ ok: true }> {
    const admin = await this.adminRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (admin && admin.isActive) {
      const token = await this.reset.crear(ResetUserType.ADMIN, admin.id);
      const base = this.config.get<string>(
        'ADMIN_APP_URL',
        'https://admin.nexusqsystem.com',
      );
      const url = `${base}/auth/reset-password?token=${token}`;
      const body =
        `<p>Recibimos una solicitud para restablecer tu contraseña del portal de administración.</p>` +
        `<p>Crea una nueva desde aquí. El enlace vence en 1 hora:</p>` +
        emailButton('Restablecer contraseña', url, '#2563eb') +
        `<p style="color:#94a3b8">Si no fuiste tú, ignora este correo.</p>`;
      const html = this.composer.brandedAdmin(
        'Restablece tu contraseña',
        body,
        'Seguridad',
      );
      await this.emailjs.enviar({
        subject: 'Restablece tu contraseña · NexQS Admin',
        html,
        to: admin.email,
      });
    }
    return { ok: true };
  }

  /** Fija la nueva contraseña del admin con el token del correo. */
  async resetPassword(dto: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: true }> {
    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }
    const r = await this.reset.consumir(dto.token);
    if (!r || r.userType !== ResetUserType.ADMIN) {
      throw new BadRequestException('El enlace no es válido o ya venció.');
    }
    const admin = await this.adminRepo.findOne({ where: { id: r.userId } });
    if (!admin) {
      throw new BadRequestException('El enlace no es válido o ya venció.');
    }
    admin.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    admin.loginAttempts = 0;
    admin.blockedUntil = null;
    await this.adminRepo.save(admin);
    const html = this.composer.brandedAdmin(
      'Tu contraseña cambió',
      `<p>Tu contraseña del portal de administración se actualizó correctamente.</p>` +
        `<p style="color:#94a3b8">Si no reconoces este cambio, avísale al equipo de Nexus de inmediato.</p>`,
      'Seguridad',
    );
    await this.emailjs
      .enviar({
        subject: 'Tu contraseña cambió · NexQS Admin',
        html,
        to: admin.email,
      })
      .catch(() => undefined);
    return { ok: true };
  }

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
