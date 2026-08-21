import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UnitReservationStatusEnum } from '../entities/unit-reservation.entity';

export class FilterUnitReservationsDto {
  /** Búsqueda de texto: cliente (nombre/razón social/teléfono) o unidad (serie/marca/modelo). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UnitReservationStatusEnum)
  status?: UnitReservationStatusEnum;

  @IsOptional()
  @IsUUID()
  catalogUnitId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
