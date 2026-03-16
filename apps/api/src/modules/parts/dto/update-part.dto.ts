import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePartDto } from './create-part.dto';

export class UpdatePartDto extends PartialType(
  OmitType(CreatePartDto, ['branchId'] as const),
) {}
