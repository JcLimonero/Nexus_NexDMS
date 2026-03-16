import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicChecklistController } from './mechanic-checklist.controller';
import { MechanicChecklistService } from './mechanic-checklist.service';
import { MechanicChecklistItem } from './entities/mechanic-checklist-item.entity';
import { MechanicSafetyChecklist } from './entities/mechanic-safety-checklist.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MechanicChecklistItem,
      MechanicSafetyChecklist,
      ServiceOrder,
    ]),
    BranchesModule,
  ],
  controllers: [MechanicChecklistController],
  providers: [MechanicChecklistService],
  exports: [MechanicChecklistService],
})
export class MechanicChecklistModule {}
