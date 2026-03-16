import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class RegisterPagoDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  paymentDate: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}
