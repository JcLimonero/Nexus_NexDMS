import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SalesAppointmentPurposeEnum,
  SalesAppointmentStatusEnum,
} from '../entities/sales-appointment.entity';

export class CreateSalesAppointmentDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsString()
  @MaxLength(200)
  clientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientPhone?: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsUUID()
  catalogUnitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  unitLabel?: string;

  @IsEnum(SalesAppointmentPurposeEnum)
  purpose: SalesAppointmentPurposeEnum;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalesAppointmentStatusDto {
  @IsEnum(SalesAppointmentStatusEnum)
  status: SalesAppointmentStatusEnum;
}
