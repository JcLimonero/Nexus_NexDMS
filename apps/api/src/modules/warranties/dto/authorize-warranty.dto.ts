import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AuthorizeWarrantyDto {
  @IsOptional()
  @IsBoolean()
  createServiceOrder?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
