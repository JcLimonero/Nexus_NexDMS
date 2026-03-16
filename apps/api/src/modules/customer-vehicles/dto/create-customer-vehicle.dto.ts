import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleTypeEnum } from '../entities/customer-vehicle.entity';

export class CreateCustomerVehicleDto {
  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsString()
  @MaxLength(100)
  make: string;

  @IsString()
  @MaxLength(200)
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engineNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsUUID()
  assignedContactId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
