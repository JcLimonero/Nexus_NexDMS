import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGlobalModelDto {
  @IsUUID()
  brandId: string;

  @IsUUID()
  vehicleTypeId: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'La versión no puede estar vacía' })
  version: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsOptional()
  @IsUUID()
  combustionTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  displacement?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  doorCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  passengerCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  exteriorColorId?: string;

  @IsOptional()
  @IsUUID()
  interiorColorId?: string;
}
