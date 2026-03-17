import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalBrandDto } from './create-global-brand.dto';

export class UpdateGlobalBrandDto extends PartialType(CreateGlobalBrandDto) {}
