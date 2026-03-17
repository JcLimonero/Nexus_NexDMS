import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVehicleTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
