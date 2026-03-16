import { IsNumber, IsUUID, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsUUID()
  branchId: string;

  @IsNumber()
  @Min(0)
  openingBalance: number;
}
