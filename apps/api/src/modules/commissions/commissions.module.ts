import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { CommissionPeriod } from './entities/commission-period.entity';
import { CommissionDetail } from './entities/commission-detail.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchesModule } from '../branches/branches.module';
import { User } from '../users/entities/user.entity';
import { ServiceOrderOperation } from '../service-orders/entities/service-order-operation.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionPeriod,
      CommissionDetail,
      Branch,
      User,
      ServiceOrderOperation,
      ServiceOrder,
      Tenant,
    ]),
    BranchesModule,
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
