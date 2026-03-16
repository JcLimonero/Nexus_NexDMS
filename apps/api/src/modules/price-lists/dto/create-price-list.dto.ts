import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PriceListTypeEnum } from '../entities/price-list.entity';

export class CreatePriceListDto {
  @IsUUID()
  branchId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(PriceListTypeEnum)
  type: PriceListTypeEnum;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPct?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
