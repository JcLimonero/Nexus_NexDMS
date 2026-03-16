import { IsInt, IsUUID, Min } from 'class-validator';

export class AddPartToServiceTypeDto {
  @IsUUID()
  partId: string;

  @IsInt()
  @Min(1)
  quantityRequired: number;
}
