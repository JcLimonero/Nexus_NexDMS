import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreatePaymentPlanDto {
  @IsInt()
  @Min(1)
  installmentCount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsDateString()
  firstPaymentDate: string;
}
