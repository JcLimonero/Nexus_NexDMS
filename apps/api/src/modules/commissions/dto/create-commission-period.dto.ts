import { IsDateString, IsEnum, IsUUID } from 'class-validator';
import { CommissionPeriodTypeEnum } from '../entities/commission-period.entity';

export class CreateCommissionPeriodDto {
  @IsUUID()
  branchId: string;

  @IsDateString()
  periodDate: string;

  @IsEnum(CommissionPeriodTypeEnum)
  type: CommissionPeriodTypeEnum;
}
