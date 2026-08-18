import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ServiceOrderPaymentMethodEnum } from '../entities/service-order.entity';

export class DeliverServiceOrderDto {
  /** Forma de pago cuando se cobra al entregar. Opcional si sale con adeudo. */
  @IsOptional()
  @IsEnum(ServiceOrderPaymentMethodEnum)
  paymentMethod?: ServiceOrderPaymentMethodEnum;

  @IsOptional()
  @IsUUID()
  cfdiUuid?: string;

  /** Entregar la unidad con el pago pendiente: genera una cuenta por cobrar. */
  @IsOptional()
  @IsBoolean()
  conAdeudo?: boolean;

  /** Fecha promesa de pago cuando se entrega con adeudo (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  fechaPromesaPago?: string;
}
