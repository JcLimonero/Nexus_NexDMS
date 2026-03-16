import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CatalogUnitVehicleTypeEnum,
  CatalogUnitStatusEnum,
} from '../entities/catalog-unit.entity';

export class FilterCatalogUnitsDto {
  @IsOptional()
  @IsEnum(CatalogUnitVehicleTypeEnum)
  vehicleType?: CatalogUnitVehicleTypeEnum;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(CatalogUnitStatusEnum)
  status?: CatalogUnitStatusEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
