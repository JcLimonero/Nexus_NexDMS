import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  WarrantyTypeEnum,
  WarrantyStatusEnum,
} from '../entities/warranty.entity';

export class FilterWarrantiesDto {
  /** Búsqueda de texto: cliente, teléfono o unidad (placa/serie). */
  @IsOptional()
  @IsString()
  search?: string;

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
