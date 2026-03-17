import { IsString, MaxLength } from 'class-validator';

export class CreateVehicleTypeDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  label: string;
}
