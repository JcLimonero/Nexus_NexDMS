import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSchedule } from './entities/user-schedule.entity';
import { UserAbsence } from './entities/user-absence.entity';
import { UserAvailabilityService } from './user-availability.service';
import { UserAvailabilityController } from './user-availability.controller';
import { UserBranch } from '../legal-entities/entities/user-branch.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { BranchRamp } from '../branch-ramps/entities/branch-ramp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSchedule,
      UserAbsence,
      UserBranch,
      UserRole,
      Appointment,
      ServiceType,
      BranchRamp,
    ]),
  ],
  controllers: [UserAvailabilityController],
  providers: [UserAvailabilityService],
  exports: [UserAvailabilityService],
})
export class UserAvailabilityModule {}
