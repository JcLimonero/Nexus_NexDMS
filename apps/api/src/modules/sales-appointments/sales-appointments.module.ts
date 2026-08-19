import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesAppointment } from './entities/sales-appointment.entity';
import { SalesAppointmentsController } from './sales-appointments.controller';
import { SalesAppointmentsService } from './sales-appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesAppointment])],
  controllers: [SalesAppointmentsController],
  providers: [SalesAppointmentsService],
  exports: [TypeOrmModule, SalesAppointmentsService],
})
export class SalesAppointmentsModule {}
