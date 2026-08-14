import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ServiceKitPhase,
  ServiceOrderPhase,
} from './entities/service-phase.entities';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceKit } from '../service-kits/entities/service-kit.entity';
import { User } from '../users/entities/user.entity';
import { ServicePhasesController } from './service-phases.controller';
import { ServicePhasesService } from './service-phases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceKitPhase,
      ServiceOrderPhase,
      ServiceOrder,
      ServiceKit,
      User,
    ]),
  ],
  controllers: [ServicePhasesController],
  providers: [ServicePhasesService],
  exports: [ServicePhasesService],
})
export class ServicePhasesModule {}
