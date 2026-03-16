import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StockMovementTypeEnum } from '../entities/stock-movement.entity';

export class FilterStockMovementsDto {
  @IsOptional()
  @IsUUID()
  partId?: string;

  @IsOptional()
  @IsEnum(StockMovementTypeEnum)
  movementType?: StockMovementTypeEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
