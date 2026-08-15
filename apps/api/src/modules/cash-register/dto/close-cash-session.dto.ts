import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashSessionDto {
  /**
   * Monto de efectivo contado. Si viene el arqueo por denominaciones se toma
   * de ahí; este campo queda para el cierre manual sin desglose.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingBalance?: number;

  /** Arqueo: cuántas piezas de cada denominación ({ "500": 3, ... }). */
  @IsOptional()
  @IsObject()
  denominations?: Record<string, number>;

  @IsOptional()
  @IsString()
  closingNotes?: string;
}
