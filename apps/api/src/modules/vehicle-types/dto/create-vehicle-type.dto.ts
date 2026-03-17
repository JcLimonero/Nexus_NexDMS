import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVehicleTypeDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  label: string;
}
