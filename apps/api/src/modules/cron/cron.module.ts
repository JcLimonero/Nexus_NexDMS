import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import { PaymentPlanInstallment } from '../unit-sales/entities/payment-plan-installment.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';
import { AppointmentNoShowJob } from './jobs/appointment-no-show.job';
import { StockMinimumJob } from './jobs/stock-minimum.job';
import { PaymentOverdueJob } from './jobs/payment-overdue.job';
import { ServiceDueRemindersJob } from './jobs/service-due-reminders.job';
import { SaasOverdueSummaryJob } from './jobs/saas-overdue-summary.job';
import { ShopDailySummaryJob } from './jobs/shop-daily-summary.job';
import { DataRetentionJob } from './jobs/data-retention.job';
import { ServicePlanningModule } from '../service-planning/service-planning.module';
import { ServiceDueNotification } from '../service-planning/entities/service-due-notification.entity';
import { SaasModule } from '../saas/saas.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Appointment,
      Part,
      PaymentPlanInstallment,
      UnitSale,
      CatalogUnit,
      Branch,
      ServiceDueNotification,
    ]),
    ServicePlanningModule,
    SaasModule,
    EmailModule,
  ],
  providers: [
    AppointmentRemindersJob,
    AppointmentNoShowJob,
    StockMinimumJob,
    PaymentOverdueJob,
    ServiceDueRemindersJob,
    SaasOverdueSummaryJob,
    ShopDailySummaryJob,
    DataRetentionJob,
  ],
})
export class CronModule {}
