import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGlobalModelsDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsUUID()
  vehicleTypeId?: string;

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
