import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PartVehicleTypeEnum } from '../entities/part.entity';

export class CreatePartDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @MaxLength(300)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PartVehicleTypeEnum)
  vehicleType: PartVehicleTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  compatibleMakes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitOfMeasure?: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  publicPrice: number;

  @IsNumber()
  @Min(0)
  wholesalePrice: number;

  @IsNumber()
  @Min(0)
  businessPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
