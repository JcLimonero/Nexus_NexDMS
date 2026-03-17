import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateGlobalModelDto {
  @IsUUID()
  brandId: string;

  @IsUUID()
  vehicleTypeId: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  version?: string;

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
  @IsBoolean()
  isActive?: boolean;
}
