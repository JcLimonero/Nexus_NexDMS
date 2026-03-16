import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseOrderLineDto } from './create-purchase-order-line.dto';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsDateString()
  orderedAt?: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines?: CreatePurchaseOrderLineDto[];
}
