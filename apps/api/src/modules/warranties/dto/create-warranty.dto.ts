import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { WarrantyTypeEnum } from '../entities/warranty.entity';

export class CreateWarrantyDto {
  @IsOptional()
  @IsUUID()
  unitSaleId?: string;

  @IsOptional()
  @IsUUID()
  serviceOrderId?: string;

  @IsUUID()
  clientId: string;

  @IsUUID()
  vehicleId: string;

  @IsUUID()
  branchId: string;

  @IsEnum(WarrantyTypeEnum)
  type: WarrantyTypeEnum;

  @IsString()
  description: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
