import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CatalogUnitVehicleTypeEnum,
  CatalogUnitStatusEnum,
} from '../entities/catalog-unit.entity';

/** local = solo agencia actual; group = todas las agencias del grupo (razón social) */
export type SearchScopeType = 'local' | 'group';

export class FilterCatalogUnitsDto {
  @IsOptional()
  @IsEnum(CatalogUnitVehicleTypeEnum)
  vehicleType?: CatalogUnitVehicleTypeEnum;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(CatalogUnitStatusEnum)
  status?: CatalogUnitStatusEnum;

  @ApiPropertyOptional({
    enum: ['local', 'group'],
    description:
      'local = solo agencia actual; group = todas las agencias del grupo (razón social)',
  })
  @IsOptional()
  @IsIn(['local', 'group'])
  searchScope?: SearchScopeType;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
