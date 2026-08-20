import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ServiceOrdersService } from './service-orders.service';
import {
  ChargeTypeEnum,
  OperationSourceEnum,
  OperationStatusEnum,
  ServiceOrderOperation,
} from './entities/service-order-operation.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { User } from '../users/entities/user.entity';

export interface OperationDto {
  code?: string;
  description: string;
  standardMinutes?: number;
  laborPrice?: number;
  chargeType?: ChargeTypeEnum;
  chargeAccount?: string;
  mechanicId?: string;
  /** Excluir esta operación de la comisión del mecánico. */
  noCommission?: boolean;
  /** Ganancia fija del mecánico en esta operación (override del %). */
  commissionOverride?: number | null;
}

/** Lo que ve el técnico antes de fichar. */
export interface OperationSummary {
  id: string;
  code: string | null;
  description: string;
  status: OperationStatusEnum;
  chargeType: ChargeTypeEnum;
  standardMinutes: number;
  /** Minutos que lleva quien pregunta. */
  ownMinutes: number;
  /** Minutos del resto de operarios en la misma operación. */
  othersMinutes: number;
  totalMinutes: number;
  /** Positivo = va por encima del baremo. Null si no hay baremo. */
  deviationMinutes: number | null;
  /** Si quien pregunta tiene el cronómetro corriendo aquí. */
  running: boolean;
  runningSince: Date | null;
  mechanicName: string | null;
}

const minutesBetween = (from: Date, to: Date): number =>
  Math.max(0, Math.round((to.getTime() - new Date(from).getTime()) / 60000));

/**
 * Operaciones de la orden y fichaje contra ellas.
 *
 * El fichaje se lleva a nivel de operación, no de orden: es la única forma
 * de comparar el tiempo real contra el baremo del fabricante y de saber
 * cuánto lleva cada técnico en cada trabajo cuando varios se reparten la
 * misma unidad.
 */
@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(ServiceOrderOperation)
    private readonly opRepo: Repository<ServiceOrderOperation>,
    @InjectRepository(ServiceOrderTime)
    private readonly timeRepo: Repository<ServiceOrderTime>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly serviceOrders: ServiceOrdersService,
    private readonly dataSource: DataSource,
  ) {}

  /** Verifica que la orden es visible para el usuario antes de tocar nada. */
  private async assertOrder(user: UserPayload, serviceOrderId: string) {
    return this.serviceOrders.findOne(user, serviceOrderId);
  }

  private async loadOperation(user: UserPayload, operationId: string) {
    const op = await this.opRepo.findOne({ where: { id: operationId } });
    if (!op) throw new NotFoundException('Operación no encontrada');
    await this.assertOrder(user, op.serviceOrderId);
    return op;
  }

  async list(
    user: UserPayload,
    serviceOrderId: string,
  ): Promise<OperationSummary[]> {
    await this.assertOrder(user, serviceOrderId);
    const ops = await this.opRepo.find({
      where: { serviceOrderId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!ops.length) return [];

    const times = await this.timeRepo.find({
      where: { serviceOrderId },
    });
    const mechanicIds = [
      ...new Set(ops.map((o) => o.mechanicId).filter((v): v is string => !!v)),
    ];
    const mechanics = mechanicIds.length
      ? await this.userRepo.findBy({ id: In(mechanicIds) })
      : [];
    const nameOf = (id: string | null) => {
      if (!id) return null;
      const u = mechanics.find((m) => m.id === id);
      return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || null : null;
    };

    const now = new Date();
    return ops.map((op) => {
      const mine = times.filter(
        (t) => t.operationId === op.id && t.mechanicId === user.sub,
      );
      const others = times.filter(
        (t) => t.operationId === op.id && t.mechanicId !== user.sub,
      );
      // Un registro abierto cuenta el tiempo transcurrido hasta ahora, si no
      // el técnico vería 0 mientras trabaja.
      const sum = (list: ServiceOrderTime[]) =>
        list.reduce(
          (acc, t) =>
            acc + (t.endedAt ? t.minutes : minutesBetween(t.startedAt, now)),
          0,
        );
      const ownMinutes = sum(mine);
      const othersMinutes = sum(others);
      const open = mine.find((t) => !t.endedAt);
      return {
        id: op.id,
        code: op.code,
        description: op.description,
        status: op.status,
        chargeType: op.chargeType,
        standardMinutes: op.standardMinutes,
        ownMinutes,
        othersMinutes,
        totalMinutes: ownMinutes + othersMinutes,
        deviationMinutes: op.standardMinutes
          ? ownMinutes + othersMinutes - op.standardMinutes
          : null,
        running: !!open,
        runningSince: open ? open.startedAt : null,
        mechanicName: nameOf(op.mechanicId),
      };
    });
  }

  async add(
    user: UserPayload,
    serviceOrderId: string,
    dto: OperationDto,
    source: OperationSourceEnum = OperationSourceEnum.RECEPTION,
    extra?: { findingId?: string; kitId?: string },
  ): Promise<ServiceOrderOperation> {
    await this.assertOrder(user, serviceOrderId);
    if (!dto.description?.trim()) {
      throw new BadRequestException('La operación necesita descripción');
    }
    const last = await this.opRepo.count({ where: { serviceOrderId } });
    const op = this.opRepo.create({
      serviceOrderId,
      code: dto.code?.trim() || null,
      description: dto.description.trim(),
      standardMinutes: dto.standardMinutes ?? 0,
      laborPrice: dto.laborPrice ?? 0,
      chargeType: dto.chargeType ?? ChargeTypeEnum.CLIENT,
      chargeAccount: dto.chargeAccount?.trim() || null,
      mechanicId: dto.mechanicId ?? null,
      noCommission: dto.noCommission ?? false,
      commissionOverride: dto.commissionOverride ?? null,
      source,
      findingId: extra?.findingId ?? null,
      kitId: extra?.kitId ?? null,
      sortOrder: last,
    });
    return this.opRepo.save(op);
  }

  async update(
    user: UserPayload,
    operationId: string,
    dto: Partial<OperationDto> & { status?: OperationStatusEnum },
  ): Promise<ServiceOrderOperation> {
    const op = await this.loadOperation(user, operationId);
    Object.assign(op, {
      code: dto.code !== undefined ? dto.code || null : op.code,
      description: dto.description?.trim() || op.description,
      standardMinutes: dto.standardMinutes ?? op.standardMinutes,
      laborPrice: dto.laborPrice ?? op.laborPrice,
      chargeType: dto.chargeType ?? op.chargeType,
      chargeAccount:
        dto.chargeAccount !== undefined
          ? dto.chargeAccount || null
          : op.chargeAccount,
      mechanicId: dto.mechanicId !== undefined ? dto.mechanicId : op.mechanicId,
      noCommission:
        dto.noCommission !== undefined ? dto.noCommission : op.noCommission,
      commissionOverride:
        dto.commissionOverride !== undefined
          ? dto.commissionOverride
          : op.commissionOverride,
      status: dto.status ?? op.status,
    });
    return this.opRepo.save(op);
  }

  async remove(user: UserPayload, operationId: string): Promise<void> {
    const op = await this.loadOperation(user, operationId);
    const fichada = await this.timeRepo.count({
      where: { operationId: op.id },
    });
    if (fichada) {
      throw new BadRequestException(
        'La operación ya tiene tiempo registrado; ciérrala en vez de borrarla',
      );
    }
    await this.opRepo.delete(op.id);
  }

  // ─── Fichaje ────────────────────────────────────────────────

  /**
   * Entra a una operación. Si el técnico venía fichado en otra, se cierra
   * sola: en el taller no se está en dos trabajos a la vez, y obligar a
   * cerrar a mano solo produce registros abiertos toda la noche.
   */
  async clockIn(
    user: UserPayload,
    operationId: string,
  ): Promise<{ entry: ServiceOrderTime; cerroAnterior: string | null }> {
    const op = await this.loadOperation(user, operationId);

    const abierta = await this.timeRepo.findOne({
      where: { mechanicId: user.sub, endedAt: IsNull() },
    });
    let cerroAnterior: string | null = null;
    if (abierta) {
      if (abierta.operationId === op.id) {
        throw new BadRequestException('Ya estás fichado en esta operación');
      }
      await this.closeEntry(abierta);
      cerroAnterior = abierta.operationId;
    }

    const entry = await this.timeRepo.save(
      this.timeRepo.create({
        serviceOrderId: op.serviceOrderId,
        operationId: op.id,
        mechanicId: user.sub,
        startedAt: new Date(),
        endedAt: null,
        minutes: 0,
      }),
    );
    if (op.status === OperationStatusEnum.PENDING) {
      await this.opRepo.update(op.id, {
        status: OperationStatusEnum.IN_PROGRESS,
        mechanicId: op.mechanicId ?? user.sub,
      });
    }
    return { entry, cerroAnterior };
  }

  /** Sale de la operación sin darla por terminada. */
  async clockOut(
    user: UserPayload,
    operationId: string,
  ): Promise<ServiceOrderTime> {
    await this.loadOperation(user, operationId);
    const abierta = await this.timeRepo.findOne({
      where: { operationId, mechanicId: user.sub, endedAt: IsNull() },
    });
    if (!abierta) throw new BadRequestException('No estás fichado aquí');
    return this.closeEntry(abierta);
  }

  /** Cierra el fichaje y marca la operación como terminada. */
  async finish(
    user: UserPayload,
    operationId: string,
  ): Promise<ServiceOrderOperation> {
    const op = await this.loadOperation(user, operationId);
    const abierta = await this.timeRepo.findOne({
      where: { operationId, mechanicId: user.sub, endedAt: IsNull() },
    });
    if (abierta) await this.closeEntry(abierta);
    await this.opRepo.update(op.id, { status: OperationStatusEnum.DONE });
    return this.opRepo.findOneOrFail({ where: { id: op.id } });
  }

  private async closeEntry(entry: ServiceOrderTime): Promise<ServiceOrderTime> {
    const endedAt = new Date();
    await this.timeRepo.update(entry.id, {
      endedAt,
      minutes: minutesBetween(entry.startedAt, endedAt),
    });
    return this.timeRepo.findOneOrFail({ where: { id: entry.id } });
  }

  /** Dónde está fichado ahora mismo el técnico, para la cabecera de la PWA. */
  async fichajeActual(user: UserPayload) {
    const abierta = await this.timeRepo.findOne({
      where: { mechanicId: user.sub, endedAt: IsNull() },
    });
    if (!abierta) return { fichado: false as const };
    const op = abierta.operationId
      ? await this.opRepo.findOne({ where: { id: abierta.operationId } })
      : null;
    const so = await this.serviceOrders.findOne(user, abierta.serviceOrderId);
    return {
      fichado: true as const,
      serviceOrderId: abierta.serviceOrderId,
      folio: so.folio,
      operationId: abierta.operationId,
      operacion: op?.description ?? 'Orden completa',
      desde: abierta.startedAt,
      minutos: minutesBetween(abierta.startedAt, new Date()),
    };
  }

  /**
   * Productividad de la orden: real contra baremo. Es el número por el que
   * pregunta cualquier jefe de taller.
   */
  async productividad(user: UserPayload, serviceOrderId: string) {
    const ops = await this.list(user, serviceOrderId);
    const baremo = ops.reduce((a, o) => a + o.standardMinutes, 0);
    const real = ops.reduce((a, o) => a + o.totalMinutes, 0);
    return {
      operaciones: ops.length,
      minutosBaremo: baremo,
      minutosReales: real,
      /** >100 % = se terminó en menos tiempo del previsto. */
      eficiencia: real > 0 ? Math.round((baremo / real) * 100) : null,
      cerradas: ops.filter((o) => o.status === OperationStatusEnum.DONE).length,
    };
  }

  /** Tiempo del técnico en un rango, para nómina y productividad individual. */
  async porTecnico(user: UserPayload, desde: string, hasta: string) {
    const entries = await this.timeRepo
      .createQueryBuilder('t')
      .innerJoin('service_orders', 'so', 'so.id = t.service_order_id')
      .where('so.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('t.started_at >= :desde', { desde: `${desde}T00:00:00` })
      .andWhere('t.started_at <= :hasta', { hasta: `${hasta}T23:59:59` })
      .andWhere('t.ended_at IS NOT NULL')
      .getMany();

    const ids = [...new Set(entries.map((e) => e.mechanicId))];
    const users = ids.length ? await this.userRepo.findBy({ id: In(ids) }) : [];
    return ids.map((id) => {
      const u = users.find((x) => x.id === id);
      const propios = entries.filter((e) => e.mechanicId === id);
      return {
        mechanicId: id,
        nombre: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : id,
        minutos: propios.reduce((a, e) => a + e.minutes, 0),
        registros: propios.length,
      };
    });
  }

  /** Operaciones nacidas de un hallazgo autorizado. */
  async porHallazgo(findingId: string) {
    return this.opRepo.find({ where: { findingId } });
  }

  // ─── Vehículo de sustitución ────────────────────────────────

  /**
   * Unidades del inventario que se pueden prestar: las que no están ya
   * prestadas en otra orden abierta. Se consulta en crudo porque cruza dos
   * módulos y una sola pasada es más clara que dos consultas y un filtro.
   */
  async unidadesSustitucionDisponibles(user: UserPayload) {
    return this.dataSource.query<
      { id: string; descripcion: string; placa: string | null }[]
    >(
      `SELECT cu.id,
              trim(coalesce(b.name,'') || ' ' || coalesce(m.name,'') || ' ' || coalesce(cu.year::text,'')) AS descripcion,
              cu.plate AS placa
         FROM catalog_units cu
         LEFT JOIN global_models m ON m.id = cu.global_model_id
         LEFT JOIN global_brands b ON b.id = m.brand_id
        WHERE cu.tenant_id = $1
          AND NOT EXISTS (
              SELECT 1 FROM service_orders so
               WHERE so.substitute_unit_id = cu.id
                 AND so.substitute_returned_at IS NULL
                 AND so.status NOT IN ('DELIVERED','CANCELLED'))
        ORDER BY descripcion
        LIMIT 100`,
      [user.tenantId],
    );
  }

  async prestarSustitucion(
    user: UserPayload,
    serviceOrderId: string,
    catalogUnitId: string,
  ) {
    const so = await this.serviceOrders.findOne(user, serviceOrderId);
    if (so.substituteUnitId && !so.substituteReturnedAt) {
      throw new BadRequestException(
        'Esta orden ya tiene una unidad de sustitución sin devolver',
      );
    }
    const libres = await this.unidadesSustitucionDisponibles(user);
    if (!libres.some((u) => u.id === catalogUnitId)) {
      throw new BadRequestException(
        'Esa unidad no está disponible para préstamo',
      );
    }
    await this.dataSource.query(
      `UPDATE service_orders
          SET substitute_unit_id = $2,
              substitute_delivered_at = now(),
              substitute_returned_at = NULL
        WHERE id = $1`,
      [serviceOrderId, catalogUnitId],
    );
    return { ok: true };
  }

  async devolverSustitucion(user: UserPayload, serviceOrderId: string) {
    const so = await this.serviceOrders.findOne(user, serviceOrderId);
    if (!so.substituteUnitId) {
      throw new BadRequestException('Esta orden no tiene unidad prestada');
    }
    await this.dataSource.query(
      `UPDATE service_orders SET substitute_returned_at = now() WHERE id = $1`,
      [serviceOrderId],
    );
    return { ok: true };
  }
}
