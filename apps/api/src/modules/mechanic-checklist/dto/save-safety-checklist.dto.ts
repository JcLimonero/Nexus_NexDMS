import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MechanicSafetyChecklistStatusEnum } from '../entities/mechanic-safety-checklist.entity';

export class SafetyChecklistItemDto {
  @IsUUID()
  itemId: string;

  @IsEnum(MechanicSafetyChecklistStatusEnum)
  status: MechanicSafetyChecklistStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaveSafetyChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyChecklistItemDto)
  items: SafetyChecklistItemDto[];
}
