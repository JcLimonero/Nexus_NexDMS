import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/\d/, {
    message: 'La nueva contraseña debe contener al menos un número',
  })
  newPassword: string;
}
