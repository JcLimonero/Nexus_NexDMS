import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { UnitSaleFinancingTypeEnum } from '../entities/unit-sale.entity';

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
}
