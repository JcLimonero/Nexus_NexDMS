import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateStockLocationDto {
  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsString()
  @MaxLength(10)
  zone: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  aisle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  shelf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
