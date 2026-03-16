import { PartialType } from '@nestjs/swagger';
import { CreateBranchPrinterDto } from './create-branch-printer.dto';

export class UpdateBranchPrinterDto extends PartialType(
  CreateBranchPrinterDto,
) {}
