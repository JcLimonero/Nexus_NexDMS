import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleTypeEnum } from '../entities/global-model.entity';

export class FilterGlobalModelsDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
