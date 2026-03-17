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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsEnum(PurchaseOrderStatusEnum)
  status?: PurchaseOrderStatusEnum;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const n = typeof value === 'string' ? parseInt(value, 10) : NaN;
    return !Number.isNaN(n) ? n : 1;
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const n = typeof value === 'string' ? parseInt(value, 10) : NaN;
    return !Number.isNaN(n) ? n : 20;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
