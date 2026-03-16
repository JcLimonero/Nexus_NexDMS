import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UnitSaleExtraTypeEnum } from '../entities/unit-sale-extra.entity';

export class CreateUnitSaleExtraDto {
  @IsEnum(UnitSaleExtraTypeEnum)
  type: UnitSaleExtraTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerReference?: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}
