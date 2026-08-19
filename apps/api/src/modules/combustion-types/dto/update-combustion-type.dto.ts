import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCombustionTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
