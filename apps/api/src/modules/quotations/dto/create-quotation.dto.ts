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
import {
  QuotationTypeEnum,
  QuotationPriceListEnum,
} from '../entities/quotation.entity';
import { QuotationLineUrgencyEnum } from '../entities/quotation-item.entity';

/** Una refacción que cuelga de un trabajo del presupuesto. */
export class CreateQuotationRefaccionDto {
  @IsUUID()
  partId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateQuotationItemDto {
  @IsOptional()
  @IsUUID()
  partId?: string;

  @IsOptional()
  @IsUUID()
  catalogUnitId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  /** Urgencia del trabajo, como la verá el cliente. */
  @IsOptional()
  @IsEnum(QuotationLineUrgencyEnum)
  urgency?: QuotationLineUrgencyEnum;

  /** Nota del técnico para el cliente sobre esta línea. */
  @IsOptional()
  @IsString()
  technicianNote?: string;

  /** Refacciones que cuelgan de este trabajo (presupuesto de servicio). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationRefaccionDto)
  refacciones?: CreateQuotationRefaccionDto[];
}

export class CreateQuotationDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  branchId: string;

  @IsEnum(QuotationTypeEnum)
  type: QuotationTypeEnum;

  @IsEnum(QuotationPriceListEnum)
  priceList: QuotationPriceListEnum;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  validityDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}
