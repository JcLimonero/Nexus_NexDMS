import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { LegalEntitiesModule } from './modules/legal-entities/legal-entities.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ClientTypesModule } from './modules/client-types/client-types.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CustomerVehiclesModule } from './modules/customer-vehicles/customer-vehicles.module';
import { PartCategoriesModule } from './modules/part-categories/part-categories.module';
import { PartsModule } from './modules/parts/parts.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { StockLocationsModule } from './modules/stock-locations/stock-locations.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { SalesModule } from './modules/sales/sales.module';
import { WarehouseTransfersModule } from './modules/warehouse-transfers/warehouse-transfers.module';
import { UsersModule } from './modules/users/users.module';
import { GlobalModelsModule } from './modules/global-models/global-models.module';
import { GlobalBrandsModule } from './modules/global-brands/global-brands.module';
import { VehicleTypesModule } from './modules/vehicle-types/vehicle-types.module';
import { VehicleCategoriesModule } from './modules/vehicle-categories/vehicle-categories.module';
import { VehicleModelsModule } from './modules/vehicle-models/vehicle-models.module';
import { VehicleVersionsModule } from './modules/vehicle-versions/vehicle-versions.module';
import { VehicleColorsModule } from './modules/vehicle-colors/vehicle-colors.module';
import { CombustionTypesModule } from './modules/combustion-types/combustion-types.module';
import { UnitLocationsModule } from './modules/unit-locations/unit-locations.module';
import { CatalogUnitsModule } from './modules/catalog-units/catalog-units.module';
import { UnitReservationsModule } from './modules/unit-reservations/unit-reservations.module';
import { UnitSalesModule } from './modules/unit-sales/unit-sales.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { WarrantiesModule } from './modules/warranties/warranties.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { BranchPrintersModule } from './modules/branch-printers/branch-printers.module';
import { CfdiLogModule } from './modules/cfdi-log/cfdi-log.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';
import {
  getThrottlerKey,
  getThrottlerTracker,
} from './common/throttler/throttler-tracker.util';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';
import { QueuesModule } from './queues/queues.module';
import { EventsModule } from './events/events.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { SuperadminAuditModule } from './modules/superadmin-audit/superadmin-audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CfdiModule } from './modules/cfdi/cfdi.module';
import { CronModule } from './modules/cron/cron.module';
import { HealthModule } from './modules/health/health.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UserAvailabilityModule } from './modules/user-availability/user-availability.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { MechanicChecklistModule } from './modules/mechanic-checklist/mechanic-checklist.module';
import { BranchRampsModule } from './modules/branch-ramps/branch-ramps.module';
import { ServicePlanningModule } from './modules/service-planning/service-planning.module';
import { UnitAccessoriesModule } from './modules/unit-accessories/unit-accessories.module';
import { UnitSaleExtrasModule } from './modules/unit-sale-extras/unit-sale-extras.module';
import { UnitReturnsModule } from './modules/unit-returns/unit-returns.module';
import { UnitReturnDocumentsModule } from './modules/unit-return-documents/unit-return-documents.module';
import { PublicPortalModule } from './modules/public-portal/public-portal.module';
import { FinanceModule } from './modules/finance/finance.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UsedUnitsModule } from './modules/used-units/used-units.module';
import { PldModule } from './modules/pld/pld.module';
import { ModulesModule } from './modules/modules/modules.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WhatsappBotModule } from './modules/whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    RedisModule,
    IdempotencyModule,
    StorageModule,
    QueuesModule,
    EventsModule,
    ThrottlerModule.forRootAsync({
      imports: [],
      inject: ['REDIS_CLIENT'],
      useFactory: (redis: { increment: unknown }) => ({
        throttlers: [
          { name: 'short', ttl: seconds(1), limit: 30 },
          { name: 'medium', ttl: seconds(60), limit: 120 },
          { name: 'long', ttl: seconds(60), limit: 300 },
        ],
        storage: new RedisThrottlerStorage(redis as never),
        getTracker: getThrottlerTracker,
        generateKey: getThrottlerKey,
      }),
    }),
    AuthModule,
    TenantsModule,
    LegalEntitiesModule,
    BranchesModule,
    ClientsModule,
    ClientTypesModule,
    ContactsModule,
    CustomerVehiclesModule,
    PartCategoriesModule,
    PartsModule,
    PurchaseOrdersModule,
    StockLocationsModule,
    StockMovementsModule,
    SuppliersModule,
    UsersModule,
    CashRegisterModule,
    SalesModule,
    WarehouseTransfersModule,
    GlobalModelsModule,
    GlobalBrandsModule,
    VehicleTypesModule,
    VehicleCategoriesModule,
    VehicleModelsModule,
    VehicleVersionsModule,
    VehicleColorsModule,
    CombustionTypesModule,
    UnitLocationsModule,
    CatalogUnitsModule,
    UnitReservationsModule,
    UnitSalesModule,
    QuotationsModule,
    AppointmentsModule,
    UserAvailabilityModule,
    ServiceTypesModule,
    MechanicChecklistModule,
    BranchRampsModule,
    ServicePlanningModule,
    UnitAccessoriesModule,
    UnitSaleExtrasModule,
    UnitReturnsModule,
    UnitReturnDocumentsModule,
    ServiceOrdersModule,
    WarrantiesModule,
    CommissionsModule,
    BranchPrintersModule,
    CfdiLogModule,
    AuditLogModule,
    PriceListsModule,
    SuperadminAuditModule,
    NotificationsModule,
    CfdiModule,
    CronModule,
    HealthModule,
    DocumentsModule,
    PublicPortalModule,
    DashboardModule,
    WhatsappBotModule,
    FinanceModule,
    LeadsModule,
    UsedUnitsModule,
    PldModule,
    ModulesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
