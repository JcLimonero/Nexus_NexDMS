import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PurchaseOrderStatusEnum } from '../entities/purchase-order.entity';

export class FilterPurchaseOrdersDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatusEnum)
  status?: PurchaseOrderStatusEnum;

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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : 1,
  )
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : 20,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
