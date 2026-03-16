import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UnitReservationStatusEnum } from '../entities/unit-reservation.entity';

export class FilterUnitReservationsDto {
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
