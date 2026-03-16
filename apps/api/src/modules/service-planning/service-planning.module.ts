import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { ServicePlanningService } from './service-planning.service';
import { ServicePlanningController } from './service-planning.controller';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ServiceType,
      CustomerVehicle,
      Client,
    ]),
    BranchesModule,
  ],
  controllers: [ServicePlanningController],
  providers: [ServicePlanningService],
  exports: [ServicePlanningService],
})
export class ServicePlanningModule {}
