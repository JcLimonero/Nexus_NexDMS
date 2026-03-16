import {
  ArrayMinSize,
  IsArray,
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

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un rol al usuario' })
  @IsEnum(RoleEnum, { each: true })
  roles: RoleEnum[];

  @IsEnum(ScopeEnum)
  scope: ScopeEnum;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[];
}
