import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @IsOptional()
  @IsString()
  closingNotes?: string;
}
