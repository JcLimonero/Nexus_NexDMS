import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartVehicleTypeEnum } from '../entities/part.entity';

export class FilterPartsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(PartVehicleTypeEnum)
  vehicleType?: PartVehicleTypeEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyAlerts?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
