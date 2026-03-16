import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatusEnum } from '../entities/sale.entity';

export class FilterSalesDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(SaleStatusEnum)
  status?: SaleStatusEnum;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

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
