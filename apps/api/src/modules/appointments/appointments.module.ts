import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { BranchesModule } from '../branches/branches.module';
import { UserAvailabilityModule } from '../user-availability/user-availability.module';
import { ServiceTypesModule } from '../service-types/service-types.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Branch, Client]),
    BranchesModule,
    UserAvailabilityModule,
    ServiceTypesModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
