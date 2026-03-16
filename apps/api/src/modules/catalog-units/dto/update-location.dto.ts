import { IsUUID } from 'class-validator';

export class UpdateCatalogUnitLocationDto {
  @IsUUID()
  locationId: string;
}
