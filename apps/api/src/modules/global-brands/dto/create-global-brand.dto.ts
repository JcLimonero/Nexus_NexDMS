import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGlobalBrandDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
