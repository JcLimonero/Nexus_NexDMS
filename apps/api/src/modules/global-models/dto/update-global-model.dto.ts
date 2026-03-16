import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalModelDto } from './create-global-model.dto';

export class UpdateGlobalModelDto extends PartialType(CreateGlobalModelDto) {}
