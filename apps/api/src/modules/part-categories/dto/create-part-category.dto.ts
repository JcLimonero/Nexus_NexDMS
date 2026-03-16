import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePartCategoryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
