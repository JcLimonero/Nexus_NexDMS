import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AppointmentOriginEnum } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  /** Asesor que recibirá. Si no viene, se reparte por carga del día. */
  @IsOptional()
  @IsUUID()
  advisorId?: string;

  @IsUUID()
  branchId: string;

  @IsEnum(AppointmentOriginEnum)
  origin: AppointmentOriginEnum;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number;
}
