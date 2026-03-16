import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceOrderStatusEnum } from '../entities/service-order.entity';

export class ChangeStatusDto {
  @IsEnum(ServiceOrderStatusEnum)
  status: ServiceOrderStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}
