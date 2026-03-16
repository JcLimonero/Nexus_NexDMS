import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CatalogUnitVehicleTypeEnum } from '../entities/catalog-unit.entity';

export class CreateCatalogUnitDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  globalModelId?: string;

  @IsEnum(CatalogUnitVehicleTypeEnum)
  vehicleType: CatalogUnitVehicleTypeEnum;

  @IsString()
  @MaxLength(100)
  brand: string;

  @IsString()
  @MaxLength(200)
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  version?: string;

  @IsString()
  @MaxLength(100)
  color: string;

  @IsString()
  @MaxLength(100)
  serialNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engineNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displacement?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  doorCount?: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  listPrice: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  acquisitionDate?: string;
}
