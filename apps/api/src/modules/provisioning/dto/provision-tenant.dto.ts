import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TenantPlanEnum } from '../../tenants/entities/tenant.entity';
import { LegalEntityTypeEnum } from '../../legal-entities/entities/legal-entity.entity';

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
}
