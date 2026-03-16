import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CommissionPeriodStatusEnum,
  CommissionPeriodTypeEnum,
} from '../entities/commission-period.entity';

export class FilterCommissionPeriodsDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(CommissionPeriodStatusEnum)
  status?: CommissionPeriodStatusEnum;

  @IsOptional()
  @IsEnum(CommissionPeriodTypeEnum)
  type?: CommissionPeriodTypeEnum;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
