import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseTransferDto } from './create-warehouse-transfer.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateWarehouseTransferDto extends PartialType(
  CreateWarehouseTransferDto,
) {
  @IsOptional()
  @IsString()
  notes?: string;
}
