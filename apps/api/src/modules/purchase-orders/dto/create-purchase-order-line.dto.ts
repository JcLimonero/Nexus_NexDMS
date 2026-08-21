import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePurchaseOrderLineDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  /** Meses de garantía que da el proveedor sobre esta refacción. */
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  warrantyNote?: string;
}
