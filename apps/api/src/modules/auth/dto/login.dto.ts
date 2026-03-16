import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código TOTP debe tener 6 dígitos' })
  totpCode?: string;
}
