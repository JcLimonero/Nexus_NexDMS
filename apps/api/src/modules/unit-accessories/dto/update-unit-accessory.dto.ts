import { PartialType } from '@nestjs/swagger';
import { CreateUnitAccessoryDto } from './create-unit-accessory.dto';

export class UpdateUnitAccessoryDto extends PartialType(
  CreateUnitAccessoryDto,
) {}
