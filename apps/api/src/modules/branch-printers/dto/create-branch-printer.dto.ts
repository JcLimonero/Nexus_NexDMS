import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  BranchPrinterTypeEnum,
  BranchPrinterUsageEnum,
} from '../entities/branch-printer.entity';

export class CreateBranchPrinterDto {
  @IsUUID()
  branchId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(BranchPrinterTypeEnum)
  type: BranchPrinterTypeEnum;

  @IsEnum(BranchPrinterUsageEnum)
  usage: BranchPrinterUsageEnum;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
