import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseTransferStatusEnum } from '../entities/warehouse-transfer.entity';

export class FilterWarehouseTransfersDto {
  /** Búsqueda de texto: folio o SKU/nombre de la refacción. */
  @IsOptional()
  @IsString()
  search?: string;

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
