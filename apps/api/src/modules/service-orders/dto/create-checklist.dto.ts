import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateChecklistDto {
  @IsInt()
  @Min(0)
  @Max(100)
  fuelLevel: number;

  @IsInt()
  @Min(0)
  kmIn: number;

  @IsBoolean()
  hasSpareTire: boolean;

  @IsBoolean()
  hasTools: boolean;

  @IsBoolean()
  hasDocuments: boolean;

  @IsBoolean()
  hasMats: boolean;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  damageDescription?: string;
}
