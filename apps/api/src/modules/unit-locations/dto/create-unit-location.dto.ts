import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UnitLocationZoneEnum } from '../entities/unit-location.entity';

export class CreateUnitLocationDto {
  @IsUUID()
  branchId: string;

  @IsString()
  code: string;

  @IsEnum(UnitLocationZoneEnum)
  zone: UnitLocationZoneEnum;

  @IsString()
  space: string;

  @IsOptional()
  @IsString()
  description?: string;
}
