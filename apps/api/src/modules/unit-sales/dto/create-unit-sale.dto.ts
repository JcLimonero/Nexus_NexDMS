import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitSaleFinancingTypeEnum } from '../entities/unit-sale.entity';
import { UnitSaleExtraTypeEnum } from '../../unit-sale-extras/entities/unit-sale-extra.entity';

export class CreateUnitSaleAccessoryItemDto {
  @IsUUID()
  accessoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateUnitSaleDto {
  @IsUUID()
  catalogUnitId: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  @IsNumber()
  @Min(0)
  finalPrice: number;

  @IsNumber()
  @Min(0)
  downPayment: number;

  @IsEnum(UnitSaleFinancingTypeEnum)
  financingType: UnitSaleFinancingTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankFinancier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankFolio?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUnitSaleAccessoryItemDto)
  accessories?: CreateUnitSaleAccessoryItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUnitSaleExtraItemDto)
  extras?: CreateUnitSaleExtraItemDto[];
}

export class CreateUnitSaleExtraItemDto {
  @IsEnum(UnitSaleExtraTypeEnum)
  type: UnitSaleExtraTypeEnum;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsString()
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
