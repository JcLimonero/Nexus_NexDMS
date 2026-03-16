import { PartialType } from '@nestjs/swagger';
import { CreateStockLocationDto } from './create-stock-location.dto';

export class UpdateStockLocationDto extends PartialType(CreateStockLocationDto) {}
