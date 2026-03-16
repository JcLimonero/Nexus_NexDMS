import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateServiceOrderDto {
  @IsUUID()
  ownerId: string;

  @IsUUID()
  vehicleId: string;

  @IsOptional()
  @IsUUID()
  receptionContactId?: string;

  @IsOptional()
  @IsString()
  receptionName?: string;

  @IsOptional()
  @IsString()
  receptionPhone?: string;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @IsString()
  reportedFault: string;

  @IsInt()
  @Min(0)
  kmIn: number;

  @IsOptional()
  @IsString()
  promisedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
