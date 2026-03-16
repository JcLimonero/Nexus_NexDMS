import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import {
  CfdiTypeEnum,
  CfdiStatusEnum,
} from '../../cfdi-log/entities/cfdi-log.entity';

export class FilterCfdiDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(CfdiTypeEnum)
  tipo?: CfdiTypeEnum;

  @IsOptional()
  @IsEnum(CfdiStatusEnum)
  status?: CfdiStatusEnum;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
