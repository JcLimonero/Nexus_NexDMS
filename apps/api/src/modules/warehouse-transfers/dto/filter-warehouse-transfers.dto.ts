import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseTransferStatusEnum } from '../entities/warehouse-transfer.entity';

export class FilterWarehouseTransfersDto {
  @IsOptional()
  @IsUUID()
  originBranchId?: string;

  @IsOptional()
  @IsUUID()
  destinationBranchId?: string;

  @IsOptional()
  @IsEnum(WarehouseTransferStatusEnum)
  status?: WarehouseTransferStatusEnum;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
