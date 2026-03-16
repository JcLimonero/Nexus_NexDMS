import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { RoleEnum, ScopeEnum } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsEnum(ScopeEnum)
  scope: ScopeEnum;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;
}
