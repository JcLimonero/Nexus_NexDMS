import { PartialType } from '@nestjs/swagger';
import { CreateCustomerVehicleDto } from './create-customer-vehicle.dto';

export class UpdateCustomerVehicleDto extends PartialType(
  CreateCustomerVehicleDto,
) {}
