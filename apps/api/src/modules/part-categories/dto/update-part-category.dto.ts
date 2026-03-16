import { PartialType } from '@nestjs/swagger';
import { CreatePartCategoryDto } from './create-part-category.dto';

export class UpdatePartCategoryDto extends PartialType(CreatePartCategoryDto) {}
