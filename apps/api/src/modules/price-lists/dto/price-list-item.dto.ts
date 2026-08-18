import { IsNumber, IsUUID, Min } from 'class-validator';

/** Alta/edición de un precio por parte dentro de una lista (upsert por parte). */
export class UpsertPriceListItemDto {
  @IsUUID()
  partId: string;

  @IsNumber()
  @Min(0)
  price: number;
}
