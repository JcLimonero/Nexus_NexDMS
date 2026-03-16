import { IsString } from 'class-validator';

export class CancelUnitSaleDto {
  @IsString()
  reason: string;
}
