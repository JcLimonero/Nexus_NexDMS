import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TenantPlanEnum } from '../entities/tenant.entity';

export class CreateTenantDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsEnum(TenantPlanEnum)
  plan: TenantPlanEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
