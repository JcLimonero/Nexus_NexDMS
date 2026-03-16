import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateCommissionDetailDto {
  @IsUUID()
  periodId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  referenceId: string;

  @IsString()
  referenceType: string;

  @IsString()
  concept: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsNumber()
  @Min(0)
  amount: number;
}
