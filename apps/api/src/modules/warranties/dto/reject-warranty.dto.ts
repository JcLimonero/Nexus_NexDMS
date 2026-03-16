import { IsOptional, IsString } from 'class-validator';

export class RejectWarrantyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
