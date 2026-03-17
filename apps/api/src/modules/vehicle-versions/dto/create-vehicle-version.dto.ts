import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleVersionDto {
  @IsUUID()
  brandId: string;

  @IsUUID()
  modelId: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
