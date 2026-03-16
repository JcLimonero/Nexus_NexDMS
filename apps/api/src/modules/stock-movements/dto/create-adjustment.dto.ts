import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { StockMovementTypeEnum } from '../entities/stock-movement.entity';

export class CreateAdjustmentDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  branchId: string;

  @IsIn([StockMovementTypeEnum.ADJUSTMENT_IN, StockMovementTypeEnum.ADJUSTMENT_OUT])
  type: StockMovementTypeEnum.ADJUSTMENT_IN | StockMovementTypeEnum.ADJUSTMENT_OUT;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
