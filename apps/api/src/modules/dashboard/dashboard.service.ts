import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from '../service-orders/entities/service-order.entity';
import {
  Appointment,
  AppointmentStatusEnum,
} from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import {
  Sale,
  SaleStatusEnum,
} from '../sales/entities/sale.entity';
import {
  UnitSale,
  UnitSaleStatusEnum,
} from '../unit-sales/entities/unit-sale.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(Appointment)
    private readonly apptRepo: Repository<Appointment>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(UnitSale)
    private readonly unitSaleRepo: Repository<UnitSale>,
    @InjectRepository(ServiceSurvey)
    private readonly surveyRepo: Repository<ServiceSurvey>,
  ) {}

  async getSummary(user: UserPayload, branchId?: string) {
    const tenantId = user.tenantId;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const withBranch = <T extends { andWhere: (...a: unknown[]) => T }>(
      qb: T,
      alias: string,
    ): T => {
      if (branchId) {
        qb.andWhere(`${alias}.branch_id = :branchId`, { branchId });
      }
      return qb;
    };

    // ── Taller ──────────────────────────────────────
    const osPorEstatus = await withBranch(
      this.soRepo
        .createQueryBuilder('so')
        .select('so.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('so.tenant_id = :tenantId', { tenantId })
        .andWhere('so.status NOT IN (:...done)', {
          done: [
            ServiceOrderStatusEnum.DELIVERED,
            ServiceOrderStatusEnum.CANCELLED,
          ],
        }),
      'so',
    )
      .groupBy('so.status')
      .getRawMany<{ status: string; count: string }>();

    const entregadasMes = await withBranch(
      this.soRepo
        .createQueryBuilder('so')
        .where('so.tenant_id = :tenantId', { tenantId })
        .andWhere('so.status = :st', { st: ServiceOrderStatusEnum.DELIVERED })
        .andWhere('so.delivered_at >= :monthStart', { monthStart }),
      'so',
    ).getCount();

    const citasHoy = await withBranch(
      this.apptRepo
        .createQueryBuilder('a')
        .where('a.tenant_id = :tenantId', { tenantId })
        .andWhere('a.scheduled_at >= :dayStart', { dayStart })
        .andWhere('a.scheduled_at < :dayEnd', {
          dayEnd: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
        })
        .andWhere('a.status NOT IN (:...off)', {
          off: [AppointmentStatusEnum.CANCELLED, AppointmentStatusEnum.NO_SHOW],
        }),
      'a',
    ).getCount();

    // ── Ventas ──────────────────────────────────────
    // unit_sales no tiene sucursal propia: se acota por la sucursal de la
    // unidad vendida (catalog_units.branch_id).
    const porSucursalUnidad = <T extends SelectQueryBuilder<UnitSale>>(
      qb: T,
    ): T => {
      if (branchId) {
        qb.innerJoin(
          'catalog_units',
          'cu',
          'cu.id = us.catalog_unit_id',
        ).andWhere('cu.branch_id = :branchId', { branchId });
      }
      return qb;
    };

    const ventasUnidadesMes = await porSucursalUnidad(
      this.unitSaleRepo
        .createQueryBuilder('us')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(us.final_price), 0)', 'total')
        .where('us.tenant_id = :tenantId', { tenantId })
        .andWhere('us.status = :st', { st: UnitSaleStatusEnum.COMPLETED })
        .andWhere('us.created_at >= :monthStart', { monthStart }),
    ).getRawOne<{ count: string; total: string }>();

    const ventasEnProceso = await porSucursalUnidad(
      this.unitSaleRepo
        .createQueryBuilder('us')
        .where('us.tenant_id = :tenantId', { tenantId })
        .andWhere('us.status = :st', { st: UnitSaleStatusEnum.IN_PROGRESS }),
    ).getCount();

    // ── Caja / mostrador ────────────────────────────
    const mostradorHoy = await withBranch(
      this.saleRepo
        .createQueryBuilder('s')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(s.total), 0)', 'total')
        .where('s.tenant_id = :tenantId', { tenantId })
        .andWhere('s.status = :st', { st: SaleStatusEnum.PAID })
        .andWhere('s.created_at >= :dayStart', { dayStart }),
      's',
    ).getRawOne<{ count: string; total: string }>();

    // ── Almacén ─────────────────────────────────────
    const bajoMinimo = await this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('p.stock_quantity <= p.min_stock')
      .getCount();

    // ── Satisfacción ────────────────────────────────
    const nps = await this.surveyRepo
      .createQueryBuilder('sv')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(sv.score), 0)', 'avg')
      .where('sv.tenant_id = :tenantId', { tenantId })
      .andWhere('sv.answered_at IS NOT NULL')
      .getRawOne<{ count: string; avg: string }>();

    return {
      taller: {
        ordenesActivas: osPorEstatus.reduce((a, r) => a + Number(r.count), 0),
        porEstatus: osPorEstatus.map((r) => ({
          status: r.status,
          count: Number(r.count),
        })),
        entregadasMes,
        citasHoy,
      },
      ventas: {
        unidadesMes: Number(ventasUnidadesMes?.count ?? 0),
        montoMes: Number(ventasUnidadesMes?.total ?? 0),
        enProceso: ventasEnProceso,
      },
      caja: {
        ticketsHoy: Number(mostradorHoy?.count ?? 0),
        ingresosHoy: Number(mostradorHoy?.total ?? 0),
      },
      almacen: {
        piezasBajoMinimo: bajoMinimo,
      },
      satisfaccion: {
        encuestasRespondidas: Number(nps?.count ?? 0),
        promedio: Math.round(Number(nps?.avg ?? 0) * 10) / 10,
      },
    };
  }
}
