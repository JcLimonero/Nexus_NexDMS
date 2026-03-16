import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceTypeCategoryEnum } from '../entities/service-type.entity';

export class CreateServiceTypeDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ServiceTypeCategoryEnum)
  category: ServiceTypeCategoryEnum;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number;

  @IsOptional()
  @IsBoolean()
  requiresRamp?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  rampDurationMin?: number;

  @IsOptional()
  schedulableDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  recurrenceKmInterval?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  recurrenceMonthsInterval?: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
