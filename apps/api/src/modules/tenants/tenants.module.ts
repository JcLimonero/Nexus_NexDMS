import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantStatusChange } from './entities/tenant-status-change.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantStatusChange])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TypeOrmModule, TenantsService],
})
export class TenantsModule {}
