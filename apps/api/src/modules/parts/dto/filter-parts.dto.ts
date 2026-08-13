import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartVehicleTypeEnum } from '../entities/part.entity';

/** local = solo agencia actual; group = todas las agencias del grupo (razón social) */
export type SearchScopeType = 'local' | 'group';

export class FilterPartsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(PartVehicleTypeEnum)
  vehicleType?: PartVehicleTypeEnum;

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
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyAlerts?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  /**
   * Tope alineado con el resto de catálogos (proveedores, unidades). Los
   * formularios que arman un selector de refacciones —cotización, orden de
   * compra, traspaso y venta de mostrador— piden el catálogo de la sucursal
   * de una vez; con el tope anterior de 100 la petición se rechazaba y el
   * combo se quedaba vacío sin explicación.
   */
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number;
}
