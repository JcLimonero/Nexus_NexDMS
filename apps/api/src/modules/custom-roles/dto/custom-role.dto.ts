import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleEnum } from '../../users/entities/user.entity';

const ROLES_BASE = Object.values(RoleEnum);

export class CreateCustomRoleDto {
  /** Solo el superadmin lo envía; el admin usa su propio tenant. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES_BASE, { each: true })
  baseRoles: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES_BASE, { each: true })
  baseRoles?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
