import { IsNumber, IsUUID, Min } from 'class-validator';

export class AddAccessoryToSaleDto {
  @IsUUID()
  accessoryId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
