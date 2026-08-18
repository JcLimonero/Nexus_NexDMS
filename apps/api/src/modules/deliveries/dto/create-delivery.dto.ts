import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryKindEnum } from '../entities/delivery.entity';

export class ChecklistItemDto {
  @IsString()
  @MaxLength(200)
  label: string;

  @IsBoolean()
  done: boolean;
}

export class CreateDeliveryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsEnum(DeliveryKindEnum)
  kind: DeliveryKindEnum;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceLabel?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  /** Si se omite, se usa la plantilla por defecto del tipo. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
