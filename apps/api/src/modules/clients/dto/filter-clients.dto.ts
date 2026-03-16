import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { ClientTypeEnum } from '../entities/client.entity';

export class FilterClientsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @IsEnum(ClientTypeEnum)
  clientType?: ClientTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
