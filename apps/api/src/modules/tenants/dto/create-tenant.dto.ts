import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TenantPlanEnum } from '../entities/tenant.entity';

export class CreateTenantDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  /**
   * Prefijo de 3 letras para los códigos de documentos (APGC00000001…). Si no
   * viene, se sugiere de las iniciales del nombre. Se fija al crear y ya no
   * cambia.
   */
  @IsOptional()
  @IsString()
  @MaxLength(3)
  codePrefix?: string;

  @IsEnum(TenantPlanEnum)
  plan: TenantPlanEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
