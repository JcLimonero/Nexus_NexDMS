import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Entrada de compra: suma existencias a un costo unitario y recalcula el costo
 * promedio ponderado de la parte.
 */
export class PurchaseEntryDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  branchId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /** Costo unitario de esta compra (sin IVA). */
  @IsNumber()
  @IsPositive()
  unitCost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
