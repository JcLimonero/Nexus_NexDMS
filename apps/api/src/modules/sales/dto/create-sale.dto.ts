import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceListEnum } from '../entities/sale.entity';
import { SalePaymentMethodEnum } from '../entities/sale-payment.entity';

export class CreateSaleLineDto {
  @IsUUID()
  partId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateSalePaymentDto {
  @IsEnum(SalePaymentMethodEnum)
  method: SalePaymentMethodEnum;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateSaleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ enum: PriceListEnum })
  @IsEnum(PriceListEnum)
  priceList: PriceListEnum;

  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines: CreateSaleLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments: CreateSalePaymentDto[];
}
