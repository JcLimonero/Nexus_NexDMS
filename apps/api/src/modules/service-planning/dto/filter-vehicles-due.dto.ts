import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class FilterVehiclesDueDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysAhead?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  kmAhead?: number;
}
