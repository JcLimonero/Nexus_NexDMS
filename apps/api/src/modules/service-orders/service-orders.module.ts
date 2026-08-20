import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrder } from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ReceptionPhoto } from './entities/reception-photo.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { ServiceOrderUpdate } from './entities/service-order-update.entity';
import { ServiceOrderFinding } from './entities/service-order-finding.entity';
import { ServiceOrderFolioSeq } from './entities/service-order-folio-seq.entity';
import { ServiceSurvey } from './entities/service-survey.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CfdiModule } from '../cfdi/cfdi.module';
import { BranchesModule } from '../branches/branches.module';
import { MechanicChecklistModule } from '../mechanic-checklist/mechanic-checklist.module';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';
import {
  ReceptionPhotoMark,
  ReceptionPhotoSpec,
} from './entities/reception-catalog.entities';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { ModulesModule } from '../modules/modules.module';
import { ServiceOrderOperation } from './entities/service-order-operation.entity';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { User } from '../users/entities/user.entity';
import { AdditionalWorkController } from './additional-work.controller';
import { AdditionalWorkService } from './additional-work.service';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { OrdenPdfService } from './orden-pdf.service';
import { FinanceModule } from '../finance/finance.module';
import { SurveysModule } from '../surveys/surveys.module';
import { ServiceOrderPromiseChange } from './entities/service-order-promise-change.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ReceptionChecklist,
      ReceptionPhoto,
      ServiceOrderPart,
      ServiceOrderTime,
      ServiceOrderUpdate,
      ServiceOrderFinding,
      ServiceOrderFolioSeq,
      ServiceOrderOperation,
      ServiceOrderPromiseChange,
      ServiceSurvey,
      User,
      ReceptionPhotoSpec,
      ReceptionPhotoMark,
      ServiceType,
      Quotation,
      QuotationItem,
      Tenant,
      Branch,
      Part,
      StockMovement,
      LegalEntity,
      CatalogUnit,
      CustomerVehicle,
      Client,
      Appointment,
    ]),
    CfdiModule,
    BranchesModule,
    MechanicChecklistModule,
    ModulesModule,
    FinanceModule,
    SurveysModule,
  ],
  controllers: [
    ServiceOrdersController,
    ReceptionController,
    OperationsController,
    AdditionalWorkController,
  ],
  providers: [
    ServiceOrdersService,
    ReceptionService,
    OperationsService,
    AdditionalWorkService,
    OrdenPdfService,
  ],
  exports: [
    ServiceOrdersService,
    ReceptionService,
    OperationsService,
    AdditionalWorkService,
  ],
})
export class ServiceOrdersModule {}
