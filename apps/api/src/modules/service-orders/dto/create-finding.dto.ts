import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FindingCriticalityEnum } from '../entities/service-order-finding.entity';

export class CreateFindingDto {
  @IsString()
  description: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresQuotation?: boolean;

  /** Qué tan urgente lo ve el técnico; guía la conversación con el cliente. */
  @IsOptional()
  @IsEnum(FindingCriticalityEnum)
  criticality?: FindingCriticalityEnum;

  /** Lo que estima que le llevará, para poder recalcular la entrega. */
  @IsOptional()
  // Llega por multipart, así que viaja como texto.
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(0)
  estimatedAmount?: number;
}
