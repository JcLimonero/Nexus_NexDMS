import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Nota de crédito (CFDI de egreso) que relaciona a un CFDI de ingreso ya
 * timbrado. Sirve para devoluciones o descuentos posteriores a la venta.
 */
export class NotaCreditoDto {
  /** Motivo visible en el concepto (devolución, descuento, bonificación…). */
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  motivo: string;

  /**
   * Monto a acreditar con IVA incluido. Si se omite, se acredita el total del
   * CFDI original (cancelación económica completa).
   */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monto?: number;
}
