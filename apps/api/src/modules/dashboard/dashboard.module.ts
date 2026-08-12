import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import { Sale } from '../sales/entities/sale.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrder,
      ServiceSurvey,
      Appointment,
      Part,
      Sale,
      UnitSale,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
