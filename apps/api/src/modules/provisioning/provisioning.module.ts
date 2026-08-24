import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { LegalEntitiesModule } from '../legal-entities/legal-entities.module';
import { BranchesModule } from '../branches/branches.module';
import { UsersModule } from '../users/users.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';
import { EmailModule } from '../../common/email/email.module';
import { MasterCatalogsModule } from '../master-catalogs/master-catalogs.module';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, LegalEntity]),
    TenantsModule,
    LegalEntitiesModule,
    BranchesModule,
    UsersModule,
    PasswordResetModule,
    EmailModule,
    MasterCatalogsModule,
  ],
  controllers: [ProvisioningController],
  providers: [ProvisioningService],
})
export class ProvisioningModule {}
