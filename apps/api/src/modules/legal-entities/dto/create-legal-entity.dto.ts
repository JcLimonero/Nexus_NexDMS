import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LegalEntityTypeEnum } from '../entities/legal-entity.entity';

export class CreateLegalEntityDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(LegalEntityTypeEnum)
  type: LegalEntityTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoKey?: string;

  /** RFC de la persona moral; con él se timbra. */
  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  taxRegime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  taxPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  facturaapiOrgId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
