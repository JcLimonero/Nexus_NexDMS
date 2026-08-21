import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceOrderStatusEnum } from '../entities/service-order.entity';

export class FilterServiceOrdersDto {
  /** Búsqueda de texto: folio, cliente, teléfono o placa. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  mechanicId?: string;

  @IsOptional()
  @IsEnum(ServiceOrderStatusEnum)
  status?: ServiceOrderStatusEnum;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
