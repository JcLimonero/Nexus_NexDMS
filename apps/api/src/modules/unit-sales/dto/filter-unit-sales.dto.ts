import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  UnitSaleStatusEnum,
  UnitSaleFinancingTypeEnum,
} from '../entities/unit-sale.entity';

export class FilterUnitSalesDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(UnitSaleStatusEnum)
  status?: UnitSaleStatusEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(UnitSaleFinancingTypeEnum)
  financingType?: UnitSaleFinancingTypeEnum;

  @IsOptional()
  dateFrom?: string;

  @IsOptional()
  dateTo?: string;
}
