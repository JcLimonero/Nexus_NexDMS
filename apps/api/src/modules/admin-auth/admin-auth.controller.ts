import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { LIMITE_ACCESO } from '../../common/throttler/limites';
import { AdminAuthService } from './admin-auth.service';
import { AdminForgotPasswordDto } from './dto/forgot-password.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';

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
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto);
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
