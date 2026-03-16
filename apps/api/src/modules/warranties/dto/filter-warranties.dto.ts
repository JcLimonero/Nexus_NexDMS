import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  WarrantyTypeEnum,
  WarrantyStatusEnum,
} from '../entities/warranty.entity';

export class FilterWarrantiesDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(WarrantyStatusEnum)
  status?: WarrantyStatusEnum;

  @IsOptional()
  @IsEnum(WarrantyTypeEnum)
  type?: WarrantyTypeEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
