import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import { PaymentPlanInstallment } from '../unit-sales/entities/payment-plan-installment.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { AppointmentRemindersJob } from './jobs/appointment-reminders.job';
import { StockMinimumJob } from './jobs/stock-minimum.job';
import { PaymentOverdueJob } from './jobs/payment-overdue.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Appointment,
      Part,
      PaymentPlanInstallment,
      UnitSale,
      CatalogUnit,
    ]),
  ],
  providers: [AppointmentRemindersJob, StockMinimumJob, PaymentOverdueJob],
})
export class CronModule {}
