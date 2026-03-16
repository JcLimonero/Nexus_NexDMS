import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePurchaseOrderLineDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
