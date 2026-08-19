import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsString,
} from 'class-validator';
import {
  CfdiTypeEnum,
  CfdiStatusEnum,
} from '../../cfdi-log/entities/cfdi-log.entity';

export class FilterCfdiDto {
  /** Búsqueda de texto: folio, serie o UUID fiscal. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(CfdiTypeEnum)
  tipo?: CfdiTypeEnum;

  @IsOptional()
  @IsEnum(CfdiStatusEnum)
  status?: CfdiStatusEnum;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
