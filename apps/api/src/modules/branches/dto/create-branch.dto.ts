import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBranchDto {
  @IsUUID()
  brandId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(13)
  rfc: string;

  @IsString()
  @MaxLength(300)
  legalName: string;

  @IsString()
  @MaxLength(10)
  taxRegime: string;

  @IsString()
  @MaxLength(10)
  taxPostalCode: string;

  @IsString()
  @MaxLength(500)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  counterPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  partsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appointmentsPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  aftersalesPhone?: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsObject()
  schedule: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facturaapiOrgId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quotationValidityDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  cfdiSerie?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
