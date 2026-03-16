import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BrandTypeEnum } from '../entities/brand.entity';

export class CreateBrandDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(BrandTypeEnum)
  type: BrandTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
