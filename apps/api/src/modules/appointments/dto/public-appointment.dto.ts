import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePublicAppointmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  branchSlug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  serviceType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  scheduledAt: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  clientPhone: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  notes?: string;
}
