import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { CommissionPeriod } from './entities/commission-period.entity';
import { CommissionDetail } from './entities/commission-detail.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommissionPeriod, CommissionDetail, Branch]),
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
