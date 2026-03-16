import { IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterCashSessionsDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
