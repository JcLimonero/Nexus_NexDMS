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
}
