import { PartialType } from '@nestjs/mapped-types';
import { CreateCatalogUnitDto } from './create-catalog-unit.dto';

export class UpdateCatalogUnitDto extends PartialType(CreateCatalogUnitDto) {}
