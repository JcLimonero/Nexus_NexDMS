import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { PriceListsModule } from '../price-lists/price-lists.module';
import { ModulesModule } from '../modules/modules.module';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';
import { FleetAgreement } from './entities/fleet-agreement.entity';
import { FleetUnit } from './entities/fleet-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetAgreement,
      FleetUnit,
      Client,
      CustomerVehicle,
    ]),
    PriceListsModule,
    ModulesModule,
  ],
  controllers: [FleetsController],
  providers: [FleetsService],
  exports: [FleetsService],
})
export class FleetsModule {}
