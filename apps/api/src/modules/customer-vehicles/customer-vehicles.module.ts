import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerVehicle } from './entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { CustomerVehiclesController } from './customer-vehicles.controller';
import { CustomerVehiclesService } from './customer-vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerVehicle, Client, ServiceOrder])],
  controllers: [CustomerVehiclesController],
  providers: [CustomerVehiclesService],
  exports: [TypeOrmModule, CustomerVehiclesService],
})
export class CustomerVehiclesModule {}
