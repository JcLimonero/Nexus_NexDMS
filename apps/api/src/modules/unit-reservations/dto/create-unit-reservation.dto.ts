import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateUnitReservationDto {
  @IsUUID()
  catalogUnitId: string;

  @IsUUID()
  clientId: string;

  @IsNumber()
  @Min(0)
  advanceAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
