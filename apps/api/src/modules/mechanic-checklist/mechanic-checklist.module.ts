import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicChecklistController } from './mechanic-checklist.controller';
import { MechanicChecklistService } from './mechanic-checklist.service';
import { InformeRevisionPdfService } from './informe-revision-pdf.service';
import { MechanicChecklistItem } from './entities/mechanic-checklist-item.entity';
import { MechanicSafetyChecklist } from './entities/mechanic-safety-checklist.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MechanicChecklistItem,
      MechanicSafetyChecklist,
      ServiceOrder,
      Branch,
      LegalEntity,
      Tenant,
    ]),
    BranchesModule,
  ],
  controllers: [MechanicChecklistController],
  providers: [MechanicChecklistService, InformeRevisionPdfService],
  exports: [MechanicChecklistService, InformeRevisionPdfService],
})
export class MechanicChecklistModule {}
