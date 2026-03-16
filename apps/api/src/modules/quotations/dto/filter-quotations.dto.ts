import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  QuotationTypeEnum,
  QuotationStatusEnum,
} from '../entities/quotation.entity';

export class FilterQuotationsDto {
  @IsOptional()
  @IsEnum(QuotationTypeEnum)
  type?: QuotationTypeEnum;

  @IsOptional()
  @IsEnum(QuotationStatusEnum)
  status?: QuotationStatusEnum;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
