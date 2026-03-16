import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ServiceOrderPaymentMethodEnum } from '../entities/service-order.entity';

export class DeliverServiceOrderDto {
  @IsEnum(ServiceOrderPaymentMethodEnum)
  paymentMethod: ServiceOrderPaymentMethodEnum;

  @IsOptional()
  @IsUUID()
  cfdiUuid?: string;
}
