import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ClientTypeEnum } from '../entities/client.entity';

export class CreateClientDto {
  @IsEnum(ClientTypeEnum)
  clientType: ClientTypeEnum;

  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyName?: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneAlt?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(300)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  curp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  taxRegime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  taxPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedDiscount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
