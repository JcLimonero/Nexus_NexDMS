import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseTransferTypeEnum } from '../entities/warehouse-transfer.entity';

export class CreateWarehouseTransferLineDto {
  @IsUUID()
  partId: string;

  @IsNotEmpty()
  @Min(1)
  quantity: number;
}

export class CreateWarehouseTransferDto {
  @IsUUID()
  originBranchId: string;

  @IsUUID()
  destinationBranchId: string;

  @IsEnum(WarehouseTransferTypeEnum)
  type: WarehouseTransferTypeEnum;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseTransferLineDto)
  lines: CreateWarehouseTransferLineDto[];
}
