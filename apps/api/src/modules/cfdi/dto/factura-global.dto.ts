import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Factura global: un solo CFDI que agrupa los tickets de público en general de
 * un periodo (típicamente el mes) que no se facturaron individualmente.
 */
export class FacturaGlobalDto {
  @IsUUID()
  branchId: string;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  /** Mes 1..12 del periodo a agrupar. */
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  /** Periodicidad SAT del agrupado. Por defecto mensual. */
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'fortnight', 'month', 'two_months'])
  periodicity?: string;

  /**
   * Ventas a incluir. Si se omite, se agrupan automáticamente todas las ventas
   * de mostrador pagadas del periodo que aún no tienen CFDI.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  saleIds?: string[];
}
