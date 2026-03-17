import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateUnitReturnDto {
  @IsUUID()
  catalogUnitId: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  unitSaleId?: string;

  @IsDateString()
  returnDate: string;

  @IsNumber()
  @Min(0)
  buybackPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
