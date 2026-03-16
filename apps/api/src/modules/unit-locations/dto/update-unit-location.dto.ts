import { PartialType } from '@nestjs/mapped-types';
import { CreateUnitLocationDto } from './create-unit-location.dto';

export class UpdateUnitLocationDto extends PartialType(CreateUnitLocationDto) {}
