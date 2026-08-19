import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitAccessoryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  satProductKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Monta en cualquier unidad; no necesita lista de modelos. */
  @IsOptional()
  @IsBoolean()
  isUniversal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  globalModelIds?: string[];
}
