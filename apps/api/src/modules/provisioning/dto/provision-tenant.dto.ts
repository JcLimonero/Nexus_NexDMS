import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlanEnum } from '../../tenants/entities/tenant.entity';
import { LegalEntityTypeEnum } from '../../legal-entities/entities/legal-entity.entity';

/** Selección de un catálogo maestro a copiar: todo, o ciertas entradas. */
export class SeleccionCatalogoDto {
  @IsString() key: string;
  @IsOptional() @IsBoolean() all?: boolean;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) ids?: string[];
}

/**
 * Datos del wizard de alta (Fase 2). Plano a propósito, para validar fácil y
 * mapear 1:1 con los pasos del wizard del admin.
 */
export class ProvisionTenantDto {
  // Paso 1 · Empresa
  @IsString() @MaxLength(200) name: string;
  @IsString() @MaxLength(100) slug: string;
  @IsOptional() @IsString() @MaxLength(3) codePrefix?: string;

  // Paso 2 · Plan y módulos
  @IsEnum(TenantPlanEnum) plan: TenantPlanEnum;
  @IsOptional() @IsUUID() saasPlanId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) enabledModules?: string[];
  @IsOptional() @IsString() palette?: string;
  /**
   * Edición desde la que se da de alta ('total-one' | 'nexqs'). La manda el
   * admin según su dominio (admin.totalone.com.mx → total-one). Si es
   * 'total-one', el tenant queda acotado al preset Total One.
   */
  @IsOptional() @IsString() edition?: string;

  // Paso 3a · Fiscal / entidad legal
  @IsOptional() @IsString() razonSocial?: string;
  @IsEnum(LegalEntityTypeEnum) giro: LegalEntityTypeEnum;
  @IsOptional() @IsString() @MaxLength(13) rfc?: string;
  @IsOptional() @IsString() @MaxLength(10) taxRegime?: string;
  @IsOptional() @IsString() @MaxLength(10) taxPostalCode?: string;

  // Paso 3b · Sucursal inicial
  @IsString() branchName: string;
  @IsOptional() @IsString() branchSlug?: string;
  @IsString() branchAddress: string;
  @IsString() branchCity: string;
  @IsString() branchState: string;
  @IsString() branchPhone: string;
  @IsEmail() branchEmail: string;

  // Paso 4 · Primer usuario admin
  @IsString() adminFirstName: string;
  @IsString() adminLastName: string;
  @IsEmail() adminEmail: string;

  // Paso 5 · Catálogos base a copiar del maestro
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeleccionCatalogoDto)
  catalogos?: SeleccionCatalogoDto[];
}
