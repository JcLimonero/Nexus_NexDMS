import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatusEnum } from '../entities/appointment.entity';

export class FilterAppointmentsDto {
  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
