import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterInstallmentPaymentDto {
  @IsDateString()
  paymentDate: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}
