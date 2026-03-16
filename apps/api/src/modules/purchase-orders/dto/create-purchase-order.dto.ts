import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseOrderLineDto } from './create-purchase-order-line.dto';

export class CreatePurchaseOrderDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  supplierId: string;

  @IsDateString()
  orderedAt: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines: CreatePurchaseOrderLineDto[];
}
