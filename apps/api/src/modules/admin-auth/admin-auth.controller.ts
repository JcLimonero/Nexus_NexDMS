import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';

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
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto);
  }

  /** Solicita el correo de recuperación de contraseña del portal admin. */
  @Post('forgot-password')
  forgotPassword(@Body() dto: { email: string }) {
    return this.service.forgotPassword(dto);
  }

  /** Fija la nueva contraseña del admin con el token del correo. */
  @Post('reset-password')
  resetPassword(@Body() dto: { token: string; newPassword: string }) {
    return this.service.resetPassword(dto);
  }
}
