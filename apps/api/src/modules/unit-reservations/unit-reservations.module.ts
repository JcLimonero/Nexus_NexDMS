import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitReservationsController } from './unit-reservations.controller';
import { UnitReservationsService } from './unit-reservations.service';
import { ComprobanteApartadoPdfService } from './comprobante-apartado-pdf.service';
import { UnitReservation } from './entities/unit-reservation.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitReservation,
      CatalogUnit,
      Client,
      Branch,
      LegalEntity,
      Tenant,
      User,
    ]),
  ],
  controllers: [UnitReservationsController],
  providers: [UnitReservationsService, ComprobanteApartadoPdfService],
  exports: [UnitReservationsService],
})
export class UnitReservationsModule {}
