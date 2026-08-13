import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ServiceKitItemDto {
  /** Se casa contra el catálogo de refacciones del tenant. */
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateServiceKitDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  kitType?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Vacío = el kit aplica a cualquier tipo de unidad. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  laborMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceKitItemDto)
  items?: ServiceKitItemDto[];
}
