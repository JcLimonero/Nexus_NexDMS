import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from '../service-orders/entities/service-order.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import {
  Appointment,
  AppointmentStatusEnum,
} from '../appointments/entities/appointment.entity';
import { Part } from '../parts/entities/part.entity';
import { Sale, SaleStatusEnum } from '../sales/entities/sale.entity';
import {
  UnitSale,
  UnitSaleStatusEnum,
} from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import {
  Payable,
  Receivable,
} from '../finance/entities/finance.entities';
import { Lead } from '../leads/leads.module';
import { UsedUnitIntake } from '../used-units/used-units.module';
import { PldOperation } from '../pld/pld.module';
import { getModule } from '../modules/module-registry';

/** Un indicador listo para pintar: el web no calcula nada. */
export interface Kpi {
  label: string;
  value: number;
  /** Cómo formatear en el cliente. */
  format: 'number' | 'currency' | 'percent' | 'rating';
  /** Semántica para el color del indicador. */
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  /** Ruta del web a la que lleva el KPI. */
  link?: string;
  hint?: string;
}

/** Serie simple para la barra de distribución del módulo. */
export interface Breakdown {
  title: string;
  items: { label: string; value: number }[];
}

export interface ModuleDashboard {
  module: string;
  name: string;
  kpis: Kpi[];
  breakdown?: Breakdown;
}

const SO_LABELS: Record<string, string> = {
  RECEIVED: 'Recibidas',
  DIAGNOSIS: 'Diagnóstico',
  IN_PROGRESS: 'En progreso',
  WAITING_PARTS: 'Esperando refacciones',
  READY: 'Listas',
};

@Injectable()
export class ModuleDashboardService {
  constructor(
    @InjectRepository(ServiceOrder) private so: Repository<ServiceOrder>,
    @InjectRepository(ServiceSurvey) private survey: Repository<ServiceSurvey>,
    @InjectRepository(Appointment) private appt: Repository<Appointment>,
    @InjectRepository(Part) private part: Repository<Part>,
    @InjectRepository(Sale) private sale: Repository<Sale>,
    @InjectRepository(UnitSale) private unitSale: Repository<UnitSale>,
    @InjectRepository(Client) private client: Repository<Client>,
    @InjectRepository(CatalogUnit) private unit: Repository<CatalogUnit>,
    @InjectRepository(PurchaseOrder) private po: Repository<PurchaseOrder>,
    @InjectRepository(Quotation) private quote: Repository<Quotation>,
    @InjectRepository(Receivable) private recv: Repository<Receivable>,
    @InjectRepository(Payable) private pay: Repository<Payable>,
    @InjectRepository(Lead) private lead: Repository<Lead>,
    @InjectRepository(UsedUnitIntake) private intake: Repository<UsedUnitIntake>,
    @InjectRepository(PldOperation) private pld: Repository<PldOperation>,
  ) {}

  private ranges() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dayStart, dayEnd, monthStart };
  }

  async get(
    user: UserPayload,
    moduleKey: string,
    branchId?: string,
  ): Promise<ModuleDashboard> {
    const def = getModule(moduleKey);
    if (!def) throw new NotFoundException(`Módulo ${moduleKey} no existe`);

    const t = user.tenantId;
    const { dayStart, dayEnd, monthStart } = this.ranges();
    const b = <T extends { andWhere: (...a: unknown[]) => T }>(
      qb: T,
      alias: string,
    ): T => (branchId ? qb.andWhere(`${alias}.branch_id = :b`, { branchId }) : qb);

    const wrap = (kpis: Kpi[], breakdown?: Breakdown): ModuleDashboard => ({
      module: def.key,
      name: def.name,
      kpis,
      breakdown,
    });

    switch (moduleKey) {
      case 'workshop': {
        const porEstatus = await b(
          this.so
            .createQueryBuilder('so')
            .select('so.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('so.tenant_id = :t', { t })
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

        const activas = porEstatus.reduce((a, r) => a + Number(r.count), 0);
        const esperando =
          porEstatus.find((r) => r.status === 'WAITING_PARTS')?.count ?? 0;
        const entregadas = await b(
          this.so
            .createQueryBuilder('so')
            .where('so.tenant_id = :t', { t })
            .andWhere('so.status = :s', { s: ServiceOrderStatusEnum.DELIVERED })
            .andWhere('so.delivered_at >= :m', { m: monthStart }),
          'so',
        ).getCount();
        const citas = await b(
          this.appt
            .createQueryBuilder('a')
            .where('a.tenant_id = :t', { t })
            .andWhere('a.scheduled_at >= :d1', { d1: dayStart })
            .andWhere('a.scheduled_at < :d2', { d2: dayEnd })
            .andWhere('a.status NOT IN (:...off)', {
              off: [
                AppointmentStatusEnum.CANCELLED,
                AppointmentStatusEnum.NO_SHOW,
              ],
            }),
          'a',
        ).getCount();
        const nps = await this.survey
          .createQueryBuilder('s')
          .select('COALESCE(AVG(s.score), 0)', 'avg')
          .where('s.tenant_id = :t', { t })
          .andWhere('s.answered_at IS NOT NULL')
          .getRawOne<{ avg: string }>();

        return wrap(
          [
            { label: 'Órdenes activas', value: activas, format: 'number', link: '/workshop/service-orders' },
            { label: 'Citas para hoy', value: citas, format: 'number', link: '/workshop/citas' },
            { label: 'Entregadas este mes', value: entregadas, format: 'number', tone: 'good' },
            {
              label: 'Esperando refacciones',
              value: Number(esperando),
              format: 'number',
              tone: Number(esperando) > 0 ? 'warn' : 'neutral',
            },
            {
              label: 'Satisfacción',
              value: Math.round(Number(nps?.avg ?? 0) * 10) / 10,
              format: 'rating',
              tone: 'good',
            },
          ],
          {
            title: 'Órdenes por estatus',
            items: porEstatus.map((r) => ({
              label: SO_LABELS[r.status] ?? r.status,
              value: Number(r.count),
            })),
          },
        );
      }

      case 'sales': {
        const mes = await b(
          this.unitSale
            .createQueryBuilder('us')
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(us.final_price), 0)', 'total')
            .where('us.tenant_id = :t', { t })
            .andWhere('us.status = :s', { s: UnitSaleStatusEnum.COMPLETED })
            .andWhere('us.created_at >= :m', { m: monthStart }),
          'us',
        ).getRawOne<{ count: string; total: string }>();
        const proceso = await b(
          this.unitSale
            .createQueryBuilder('us')
            .where('us.tenant_id = :t', { t })
            .andWhere('us.status = :s', { s: UnitSaleStatusEnum.IN_PROGRESS }),
          'us',
        ).getCount();
        const ticket =
          Number(mes?.count ?? 0) > 0
            ? Number(mes?.total ?? 0) / Number(mes?.count)
            : 0;

        return wrap([
          { label: 'Unidades vendidas (mes)', value: Number(mes?.count ?? 0), format: 'number', link: '/sales' },
          { label: 'Monto vendido (mes)', value: Number(mes?.total ?? 0), format: 'currency', tone: 'good' },
          { label: 'Ventas en proceso', value: proceso, format: 'number', tone: proceso > 0 ? 'warn' : 'neutral' },
          { label: 'Ticket promedio', value: Math.round(ticket), format: 'currency' },
        ]);
      }

      case 'cash-register': {
        const hoy = await b(
          this.sale
            .createQueryBuilder('s')
            .select('COUNT(*)', 'count')
            .addSelect('COALESCE(SUM(s.total), 0)', 'total')
            .where('s.tenant_id = :t', { t })
            .andWhere('s.status = :st', { st: SaleStatusEnum.PAID })
            .andWhere('s.created_at >= :d', { d: dayStart }),
          's',
        ).getRawOne<{ count: string; total: string }>();
        const abiertas = await b(
          this.sale
            .createQueryBuilder('s')
            .where('s.tenant_id = :t', { t })
            .andWhere('s.status = :st', { st: SaleStatusEnum.OPEN }),
          's',
        ).getCount();
        const mes = await b(
          this.sale
            .createQueryBuilder('s')
            .select('COALESCE(SUM(s.total), 0)', 'total')
            .where('s.tenant_id = :t', { t })
            .andWhere('s.status = :st', { st: SaleStatusEnum.PAID })
            .andWhere('s.created_at >= :m', { m: monthStart }),
          's',
        ).getRawOne<{ total: string }>();

        return wrap([
          { label: 'Ingresos de hoy', value: Number(hoy?.total ?? 0), format: 'currency', tone: 'good', link: '/cash-register' },
          { label: 'Tickets de hoy', value: Number(hoy?.count ?? 0), format: 'number' },
          { label: 'Ventas abiertas', value: abiertas, format: 'number', tone: abiertas > 0 ? 'warn' : 'neutral' },
          { label: 'Ingresos del mes', value: Number(mes?.total ?? 0), format: 'currency' },
        ]);
      }

      case 'parts-inventory': {
        const total = await this.part
          .createQueryBuilder('p')
          .where('p.tenant_id = :t', { t })
          .andWhere('p.deleted_at IS NULL')
          .getCount();
        const bajo = await this.part
          .createQueryBuilder('p')
          .where('p.tenant_id = :t', { t })
          .andWhere('p.deleted_at IS NULL')
          .andWhere('p.stock_quantity <= p.min_stock')
          .getCount();
        const sinStock = await this.part
          .createQueryBuilder('p')
          .where('p.tenant_id = :t', { t })
          .andWhere('p.deleted_at IS NULL')
          .andWhere('p.stock_quantity = 0')
          .getCount();

        return wrap([
          { label: 'Partes en catálogo', value: total, format: 'number', link: '/parts-inventory' },
          { label: 'Bajo mínimo', value: bajo, format: 'number', tone: bajo > 0 ? 'warn' : 'good' },
          { label: 'Sin existencia', value: sinStock, format: 'number', tone: sinStock > 0 ? 'bad' : 'good' },
        ]);
      }

      case 'units-inventory': {
        const total = await b(
          this.unit
            .createQueryBuilder('cu')
            .where('cu.tenant_id = :t', { t })
            .andWhere('cu.deleted_at IS NULL'),
          'cu',
        ).getCount();
        const porEstado = await b(
          this.unit
            .createQueryBuilder('cu')
            .select('cu.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('cu.tenant_id = :t', { t })
            .andWhere('cu.deleted_at IS NULL'),
          'cu',
        )
          .groupBy('cu.status')
          .getRawMany<{ status: string; count: string }>();

        return wrap(
          [{ label: 'Unidades en inventario', value: total, format: 'number', link: '/units-inventory' }],
          {
            title: 'Unidades por estado',
            items: porEstado.map((r) => ({ label: r.status, value: Number(r.count) })),
          },
        );
      }

      case 'purchases': {
        const abiertas = await b(
          this.po.createQueryBuilder('po').where('po.tenant_id = :t', { t }),
          'po',
        ).getCount();
        return wrap([
          { label: 'Órdenes de compra', value: abiertas, format: 'number', link: '/purchases/purchase-orders' },
        ]);
      }

      case 'quotes': {
        const total = await b(
          this.quote.createQueryBuilder('q').where('q.tenant_id = :t', { t }),
          'q',
        ).getCount();
        const mes = await b(
          this.quote
            .createQueryBuilder('q')
            .where('q.tenant_id = :t', { t })
            .andWhere('q.created_at >= :m', { m: monthStart }),
          'q',
        ).getCount();
        return wrap([
          { label: 'Cotizaciones', value: total, format: 'number', link: '/quotes' },
          { label: 'Emitidas este mes', value: mes, format: 'number', tone: 'good' },
        ]);
      }

      case 'clients': {
        const total = await this.client
          .createQueryBuilder('c')
          .where('c.tenant_id = :t', { t })
          .andWhere('c.deleted_at IS NULL')
          .getCount();
        const nuevos = await this.client
          .createQueryBuilder('c')
          .where('c.tenant_id = :t', { t })
          .andWhere('c.deleted_at IS NULL')
          .andWhere('c.created_at >= :m', { m: monthStart })
          .getCount();
        return wrap([
          { label: 'Clientes registrados', value: total, format: 'number', link: '/clients' },
          { label: 'Nuevos este mes', value: nuevos, format: 'number', tone: 'good' },
        ]);
      }

      case 'leads': {
        const rows = await this.lead
          .createQueryBuilder('l')
          .select('l.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .where('l.tenant_id = :t', { t })
          .groupBy('l.status')
          .getRawMany<{ status: string; count: string }>();
        const by = (s: string) =>
          Number(rows.find((r) => r.status === s)?.count ?? 0);
        const abiertos = rows
          .filter((r) => !['WON', 'LOST'].includes(r.status))
          .reduce((a, r) => a + Number(r.count), 0);
        const ganados = by('WON');
        const cerrados = ganados + by('LOST');

        return wrap(
          [
            { label: 'Leads abiertos', value: abiertos, format: 'number', link: '/leads' },
            { label: 'Ganados', value: ganados, format: 'number', tone: 'good' },
            {
              label: 'Tasa de conversión',
              value: cerrados ? Math.round((ganados / cerrados) * 100) : 0,
              format: 'percent',
            },
          ],
          {
            title: 'Pipeline por etapa',
            items: rows.map((r) => ({ label: r.status, value: Number(r.count) })),
          },
        );
      }

      case 'used-units': {
        const rows = await this.intake
          .createQueryBuilder('i')
          .select('i.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .where('i.tenant_id = :t', { t })
          .groupBy('i.status')
          .getRawMany<{ status: string; count: string }>();
        const by = (s: string) =>
          Number(rows.find((r) => r.status === s)?.count ?? 0);
        return wrap(
          [
            { label: 'Tomas en proceso', value: rows.filter((r) => !['PURCHASED', 'REJECTED'].includes(r.status)).reduce((a, r) => a + Number(r.count), 0), format: 'number', link: '/used-units' },
            { label: 'Compradas', value: by('PURCHASED'), format: 'number', tone: 'good' },
          ],
          {
            title: 'Tomas por estatus',
            items: rows.map((r) => ({ label: r.status, value: Number(r.count) })),
          },
        );
      }

      case 'finance': {
        const openSum = async (repo: Repository<Receivable | Payable>) => {
          const r = await repo
            .createQueryBuilder('d')
            .select('COALESCE(SUM(d.total - d.paid_amount), 0)', 'saldo')
            .addSelect('COUNT(*)', 'count')
            .where('d.tenant_id = :t', { t })
            .andWhere("d.status IN ('OPEN','PARTIAL')")
            .getRawOne<{ saldo: string; count: string }>();
          return { saldo: Number(r?.saldo ?? 0), count: Number(r?.count ?? 0) };
        };
        const cxc = await openSum(this.recv as Repository<Receivable>);
        const cxp = await openSum(this.pay as unknown as Repository<Payable>);

        return wrap([
          { label: 'Por cobrar', value: cxc.saldo, format: 'currency', tone: 'warn', link: '/finance' },
          { label: 'Por pagar', value: cxp.saldo, format: 'currency', tone: 'bad', link: '/finance' },
          { label: 'Balance', value: cxc.saldo - cxp.saldo, format: 'currency', tone: cxc.saldo - cxp.saldo >= 0 ? 'good' : 'bad' },
          { label: 'Documentos abiertos', value: cxc.count + cxp.count, format: 'number' },
        ]);
      }

      case 'pld': {
        const ops = await this.pld.find({ where: { tenantId: t } });
        const pendExp = ops.filter((o) => o.fileStatus === 'PENDING').length;
        const pendAviso = ops.filter((o) => o.noticeStatus === 'PENDING').length;
        return wrap([
          { label: 'Operaciones vulnerables', value: ops.length, format: 'number', link: '/pld' },
          { label: 'Expedientes pendientes', value: pendExp, format: 'number', tone: pendExp > 0 ? 'warn' : 'good' },
          { label: 'Avisos pendientes', value: pendAviso, format: 'number', tone: pendAviso > 0 ? 'bad' : 'good' },
          { label: 'Avisos presentados', value: ops.filter((o) => o.noticeStatus === 'REPORTED').length, format: 'number', tone: 'good' },
        ]);
      }

      case 'warehouse': {
        return wrap([
          { label: 'Traspasos', value: 0, format: 'number', link: '/warehouse/transferencias', hint: 'Pendiente de conectar' },
        ]);
      }

      default:
        return wrap([]);
    }
  }
}
