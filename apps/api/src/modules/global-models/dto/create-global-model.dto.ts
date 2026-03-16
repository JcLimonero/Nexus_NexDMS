import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleTypeEnum } from '../entities/global-model.entity';

export class CreateGlobalModelDto {
  @IsString()
  brandName: string;

  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsString()
  model: string;

  @IsInt()
  @Min(1900)
  yearStart: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  yearEnd?: number;

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
