import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Alta de sucursal desde la administración (SaaS): el admin de la plataforma
 * captura los datos básicos por el cliente. El horario y la configuración fina
 * (WhatsApp, banco, folios…) se dejan a `{}`/valores por defecto y el cliente
 * los ajusta después desde su propio DMS.
 */
export class CreateSaasBranchDto {
  @IsUUID()
  legalEntityId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(500)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  counterPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  partsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appointmentsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  aftersalesPhone?: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Edición de sucursal desde la administración: todo opcional. */
export class UpdateSaasBranchDto {
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  counterPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  partsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appointmentsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  aftersalesPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
