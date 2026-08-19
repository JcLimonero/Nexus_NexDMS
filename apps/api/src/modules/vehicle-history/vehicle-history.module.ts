import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleOwnership } from './entities/vehicle-ownership.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { VehicleHistoryController } from './vehicle-history.controller';
import { VehicleHistoryService } from './vehicle-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleOwnership,
      CustomerVehicle,
      Client,
      ServiceOrder,
    ]),
  ],
  controllers: [VehicleHistoryController],
  providers: [VehicleHistoryService],
  exports: [VehicleHistoryService],
})
export class VehicleHistoryModule {}
