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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
