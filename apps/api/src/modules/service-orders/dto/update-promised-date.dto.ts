import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Cambio de la fecha prometida de entrega. El motivo es obligatorio: mover la
 * fecha sin justificación deja al asesor sin qué decirle al cliente.
 */
export class UpdatePromisedDateDto {
  @IsOptional()
  @IsDateString()
  promisedAt?: string | null;

  @IsString()
  @MinLength(3)
  reason: string;
}
