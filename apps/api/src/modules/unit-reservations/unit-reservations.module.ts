import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitReservationsController } from './unit-reservations.controller';
import { UnitReservationsService } from './unit-reservations.service';
import { UnitReservation } from './entities/unit-reservation.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnitReservation, CatalogUnit, Client])],
  controllers: [UnitReservationsController],
  providers: [UnitReservationsService],
  exports: [UnitReservationsService],
})
export class UnitReservationsModule {}
