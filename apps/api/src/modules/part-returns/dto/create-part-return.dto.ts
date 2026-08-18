import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RefundMethodEnum,
  ReturnKindEnum,
} from '../entities/part-return.entity';
import { ReturnItemConditionEnum } from '../entities/part-return-item.entity';

export class CreatePartReturnLineDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsEnum(ReturnItemConditionEnum)
  condition?: ReturnItemConditionEnum;
}

export class CreatePartReturnDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsEnum(ReturnKindEnum)
  kind: ReturnKindEnum;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsBoolean()
  isWarranty?: boolean;

  /** Si toca el stock vendible (reingreso en devolución / salida en reclamo). */
  @IsOptional()
  @IsBoolean()
  restock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  reason?: string;

  @IsOptional()
  @IsEnum(RefundMethodEnum)
  refundMethod?: RefundMethodEnum;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePartReturnLineDto)
  lines: CreatePartReturnLineDto[];
}
