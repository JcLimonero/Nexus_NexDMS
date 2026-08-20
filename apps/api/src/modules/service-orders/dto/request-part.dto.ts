import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * Solicita una refacción para una orden de servicio: genera una requisición de
 * compra ligada a la orden (source_type = 'service_order'). Es el puente que
 * permite saber, desde la orden de compra, de qué orden de taller salió.
 */
export class RequestPartDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
