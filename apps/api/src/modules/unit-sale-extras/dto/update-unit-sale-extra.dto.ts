import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  UnitSaleExtraStatusEnum,
  UnitSaleExtraTypeEnum,
} from '../entities/unit-sale-extra.entity';

export class UpdateUnitSaleExtraDto {
  @IsOptional()
  @IsEnum(UnitSaleExtraTypeEnum)
  type?: UnitSaleExtraTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsEnum(UnitSaleExtraStatusEnum)
  status?: UnitSaleExtraStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}
