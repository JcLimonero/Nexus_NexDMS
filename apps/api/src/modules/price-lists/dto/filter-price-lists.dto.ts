import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class FilterPriceListsDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
