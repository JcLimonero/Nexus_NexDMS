import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { LIMITE_ACCESO } from '../../common/throttler/limites';
import { AdminAuthService } from './admin-auth.service';
import { AdminForgotPasswordDto } from './dto/forgot-password.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
import {
  limpiarCookiesSesion,
  ponerCookiesSesion,
} from '../../common/auth/cookies';

class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  /** Acceso al portal de administración del SaaS (identidad admin_users). */
  @Post('login')
  @Throttle(LIMITE_ACCESO)
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.service.login(dto);
    if (r?.accessToken) ponerCookiesSesion(res, r.accessToken);
    return r;
  }

  /** Cierra la sesión del portal admin: borra la cookie httpOnly. */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    limpiarCookiesSesion(res);
  }

  /** Solicita el correo de recuperación de contraseña del portal admin. */
  @Post('forgot-password')
  @Throttle(LIMITE_ACCESO)
  forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.service.forgotPassword(dto);
  }

  /** Fija la nueva contraseña del admin con el token del correo. */
  @Post('reset-password')
  @Throttle(LIMITE_ACCESO)
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.service.resetPassword(dto);
  }
}
