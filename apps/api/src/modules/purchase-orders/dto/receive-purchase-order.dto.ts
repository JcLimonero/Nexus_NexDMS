import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveLineDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines: ReceiveLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
