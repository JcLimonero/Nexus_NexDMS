import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  UnitReservation,
  UnitReservationStatusEnum,
} from './entities/unit-reservation.entity';
import {
  CatalogUnit,
  CatalogUnitStatusEnum,
} from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateUnitReservationDto } from './dto/create-unit-reservation.dto';
import { FilterUnitReservationsDto } from './dto/filter-unit-reservations.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class UnitReservationsService {
  constructor(
    @InjectRepository(UnitReservation)
    private readonly reservationRepo: Repository<UnitReservation>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly dataSource: DataSource,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<UnitReservation>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanReserve(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo SELLER, MANAGER y ADMIN pueden crear apartados',
      );
    }
  }

  private assertCanRelease(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo MANAGER y ADMIN pueden liberar apartados',
      );
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterUnitReservationsDto,
  ): Promise<UnitReservation[]> {
    const qb = this.reservationRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.catalogUnit', 'cu')
      .where('ur.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.status) {
      qb.andWhere('ur.status = :status', { status: filters.status });
    }
    if (filters.catalogUnitId) {
      qb.andWhere('ur.catalog_unit_id = :catalogUnitId', {
        catalogUnitId: filters.catalogUnitId,
      });
    }
    if (filters.clientId) {
      qb.andWhere('ur.client_id = :clientId', { clientId: filters.clientId });
    }
    if (filters.branchId) {
      qb.andWhere('cu.branch_id = :branchId', { branchId: filters.branchId });
    }

    return qb.orderBy('ur.created_at', 'DESC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<UnitReservation> {
    const qb = this.reservationRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.catalogUnit', 'cu')
      .where('ur.id = :id', { id })
      .andWhere('ur.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    const reservation = await qb.getOne();
    if (!reservation) {
      throw new NotFoundException(`Apartado ${id} no encontrado`);
    }
    return reservation;
  }

  async create(
    user: UserPayload,
    dto: CreateUnitReservationDto,
  ): Promise<UnitReservation> {
    this.assertCanReserve(user);

    return this.dataSource.transaction(async (em) => {
      const unit = await em.findOne(CatalogUnit, {
        where: { id: dto.catalogUnitId, tenantId: user.tenantId },
      });
      if (!unit) {
        throw new NotFoundException('Unidad no encontrada');
      }

      if (unit.status !== CatalogUnitStatusEnum.AVAILABLE) {
        throw new BadRequestException(
          `La unidad no está disponible (estatus actual: ${unit.status})`,
        );
      }

      const activeReservation = await em.findOne(UnitReservation, {
        where: {
          catalogUnitId: dto.catalogUnitId,
          status: UnitReservationStatusEnum.ACTIVE,
        },
      });
      if (activeReservation) {
        throw new BadRequestException(
          'Ya existe un apartado activo para esta unidad',
        );
      }

      const client = await em.findOne(Client, {
        where: { id: dto.clientId, tenantId: user.tenantId },
      });
      if (!client) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const reservation = em.create(UnitReservation, {
        catalogUnitId: dto.catalogUnitId,
        clientId: dto.clientId,
        userId: user.sub,
        advanceAmount: dto.advanceAmount,
        status: UnitReservationStatusEnum.ACTIVE,
        notes: dto.notes ?? null,
        tenantId: user.tenantId,
      });

      const saved = await em.save(UnitReservation, reservation);

      unit.status = CatalogUnitStatusEnum.RESERVED;
      await em.save(CatalogUnit, unit);

      return saved;
    });
  }

  async release(
    user: UserPayload,
    id: string,
    reason: string,
  ): Promise<UnitReservation> {
    this.assertCanRelease(user);

    const reservation = await this.findOne(user, id);

    if (reservation.status !== UnitReservationStatusEnum.ACTIVE) {
      throw new BadRequestException(
        `Solo se pueden liberar apartados activos (estatus actual: ${reservation.status})`,
      );
    }

    return this.dataSource.transaction(async (em) => {
      reservation.status = UnitReservationStatusEnum.RELEASED;
      reservation.releasedById = user.sub;
      reservation.releaseReason = reason;
      await em.save(UnitReservation, reservation);

      const unit = await em.findOne(CatalogUnit, {
        where: { id: reservation.catalogUnitId },
      });
      if (unit) {
        unit.status = CatalogUnitStatusEnum.AVAILABLE;
        await em.save(CatalogUnit, unit);
      }

      return reservation;
    });
  }
}
