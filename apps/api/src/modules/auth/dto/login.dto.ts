import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'tenant-uuid', required: false })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ example: 'admin@demo.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código TOTP debe tener 6 dígitos' })
  totpCode?: string;
}
