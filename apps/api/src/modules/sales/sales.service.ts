import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import {
  SaleStatusEnum,
  SaleTypeEnum,
  PaymentMethodEnum,
} from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import {
  SalePayment,
  SalePaymentMethodEnum,
} from './entities/sale-payment.entity';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { CashSessionStatusEnum } from '../cash-register/entities/cash-session.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FilterSalesDto } from './dto/filter-sales.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { CfdiService } from '../cfdi/cfdi.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly itemRepo: Repository<SaleItem>,
    @InjectRepository(SalePayment)
    private readonly paymentRepo: Repository<SalePayment>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepo: Repository<CashSession>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly cfdiService: CfdiService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Sale>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('s.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = s.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'CASHIER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER, SELLER y ADMIN pueden crear ventas',
      );
    }
  }

  private async generateTicketNumber(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO sale_ticket_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = sale_ticket_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `TK-${year}-${String(seq).padStart(4, '0')}`;
  }

  async create(user: UserPayload, dto: CreateSaleDto): Promise<Sale> {
    this.assertCanWrite(user);

    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una línea');
    }
    if (!dto.payments?.length) {
      throw new BadRequestException('Debe incluir al menos un pago');
    }

    const cashSession = await this.cashSessionRepo.findOne({
      where: {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        status: CashSessionStatusEnum.OPEN,
      },
    });
    if (!cashSession) {
      throw new BadRequestException('No hay caja abierta para esta sucursal');
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const taxRate = Number(branch.taxRate) || 0.16;

    const partIds = [...new Set(dto.lines.map((l) => l.partId))];
    const parts = await this.partRepo.find({
      where: {
        id: In(partIds),
        branchId: dto.branchId,
        tenantId: user.tenantId,
      },
    });
    const partMap = new Map(parts.map((p) => [p.id, p]));
    const missing = partIds.filter((id) => !partMap.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Parte(s) no encontrada(s) en la sucursal: ${missing.join(', ')}`,
      );
    }

    let subtotal = 0;
    const linesData = dto.lines.map((line) => {
      const lineSubtotal =
        line.quantity * line.unitPrice - (line.discount ?? 0);
      subtotal += lineSubtotal;
      return {
        partId: line.partId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount ?? 0,
        subtotal: lineSubtotal,
      };
    });

    const discount = dto.discount ?? 0;
    const subtotalAfterDiscount = subtotal - discount;
    const taxAmount = Math.round(subtotalAfterDiscount * taxRate * 100) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    const paymentsSum = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsSum - total) > 0.01) {
      throw new BadRequestException(
        `Los pagos ($${paymentsSum.toFixed(2)}) no suman el total de la venta ($${total.toFixed(2)})`,
      );
    }

    const paymentMethod =
      dto.payments.length === 1
        ? this.mapPaymentToSaleMethod(dto.payments[0].method)
        : PaymentMethodEnum.MIXED;

    return this.dataSource
      .transaction(async (em) => {
        for (const line of linesData) {
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: line.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId: dto.branchId })
            .andWhere('p.deleted_at IS NULL')
            .getOne();

          if (!part) {
            throw new NotFoundException(
              `Parte ${line.partId} no encontrada en la sucursal`,
            );
          }
          if (part.stockQuantity < line.quantity) {
            throw new BadRequestException(
              `Stock insuficiente para ${part.name}: disponible ${part.stockQuantity}, solicitado ${line.quantity}`,
            );
          }
        }

        const ticketNumber = await this.generateTicketNumber(user.tenantId, em);

        const sale = em.create(Sale, {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          cashSessionId: cashSession.id,
          clientId: dto.clientId ?? null,
          userId: user.sub,
          saleType: SaleTypeEnum.COUNTER,
          status: SaleStatusEnum.PAID,
          paymentMethod,
          priceList: dto.priceList,
          subtotal,
          discount,
          taxAmount,
          total,
          ticketNumber,
        });
        const savedSale = await em.save(sale);

        for (const line of linesData) {
          const item = em.create(SaleItem, {
            saleId: savedSale.id,
            partId: line.partId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            subtotal: line.subtotal,
          });
          await em.save(item);
        }

        for (const p of dto.payments) {
          const payment = em.create(SalePayment, {
            saleId: savedSale.id,
            method: p.method,
            amount: p.amount,
            reference: p.reference ?? null,
          });
          await em.save(payment);
        }

        for (const line of linesData) {
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: line.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId: dto.branchId })
            .getOne();

          if (!part) continue;

          const stockBefore = part.stockQuantity;
          const stockAfter = stockBefore - line.quantity;

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: line.partId,
            branchId: dto.branchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.SALE_OUT,
            quantity: line.quantity,
            stockBefore,
            stockAfter,
            referenceId: savedSale.id,
            referenceType: 'sale',
            notes: null,
          });
          await em.save(movement);

          part.stockQuantity = stockAfter;
          await em.save(part);
        }

        const session = await em.findOne(CashSession, {
          where: { id: cashSession.id },
        });
        if (!session)
          throw new NotFoundException('Sesión de caja no encontrada');

        const cashAmount = dto.payments
          .filter((p) => p.method === SalePaymentMethodEnum.CASH)
          .reduce((s, p) => s + p.amount, 0);
        const cardAmount = dto.payments
          .filter((p) => p.method === SalePaymentMethodEnum.CARD)
          .reduce((s, p) => s + p.amount, 0);
        const transferAmount = dto.payments
          .filter((p) => p.method === SalePaymentMethodEnum.TRANSFER)
          .reduce((s, p) => s + p.amount, 0);

        session.totalCash = Number(session.totalCash) + cashAmount;
        session.totalCard = Number(session.totalCard) + cardAmount;
        session.totalTransfer = Number(session.totalTransfer) + transferAmount;
        session.totalSales = Number(session.totalSales) + total;
        await em.save(session);

        return savedSale.id;
      })
      .then(async (id) => {
        try {
          await this.cfdiService.generarIngreso('Sale', id);
        } catch (e) {
          this.logger.warn('CFDI no generado', e);
        }
        return this.findOne(user, id);
      });
  }

  private mapPaymentToSaleMethod(
    method: SalePaymentMethodEnum,
  ): PaymentMethodEnum {
    const map: Record<SalePaymentMethodEnum, PaymentMethodEnum> = {
      [SalePaymentMethodEnum.CASH]: PaymentMethodEnum.CASH,
      [SalePaymentMethodEnum.CARD]: PaymentMethodEnum.CARD,
      [SalePaymentMethodEnum.TRANSFER]: PaymentMethodEnum.TRANSFER,
    };
    return map[method];
  }

  async findAll(
    user: UserPayload,
    filters: FilterSalesDto,
  ): Promise<{
    data: Sale[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .leftJoinAndSelect('s.payments', 'payments')
      .leftJoinAndSelect('s.client', 'client')
      .leftJoinAndSelect('s.branch', 'branch')
      .where('s.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      qb.andWhere(
        `(s.ticket_number ILIKE :s
          OR client.first_name ILIKE :s
          OR client.last_name ILIKE :s
          OR client.company_name ILIKE :s
          OR client.phone ILIKE :s)`,
        { s },
      );
    }
    if (filters.clientId) {
      qb.andWhere('s.client_id = :clientId', {
        clientId: filters.clientId,
      });
    }
    if (filters.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }
    if (filters.cashSessionId) {
      qb.andWhere('s.cash_session_id = :cashSessionId', {
        cashSessionId: filters.cashSessionId,
      });
    }
    if (filters.branchId) {
      qb.andWhere('s.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }

    const [data, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: UserPayload, id: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: [
        'items',
        'items.part',
        'payments',
        'client',
        'branch',
        'cashSession',
      ],
    });
    if (!sale) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const qb = this.saleRepo
      .createQueryBuilder('s')
      .where('s.id = :id', { id })
      .andWhere('s.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    return sale;
  }

  async cancel(
    user: UserPayload,
    id: string,
    _dto?: CancelSaleDto,
  ): Promise<Sale> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden cancelar ventas',
      );
    }

    const sale = await this.findOne(user, id);
    if (sale.status === SaleStatusEnum.CANCELLED) {
      throw new BadRequestException('La venta ya está cancelada');
    }

    const today = new Date().toDateString();
    const saleDate = new Date(sale.createdAt).toDateString();
    if (saleDate !== today) {
      throw new BadRequestException(
        'Solo se pueden cancelar ventas del día actual',
      );
    }

    if (sale.cfdiUuid) {
      throw new BadRequestException(
        `Esta venta tiene CFDI timbrado (${sale.cfdiUuid}). Cancélalo manualmente desde Facturación con motivo SAT.`,
      );
    }

    const branch = await this.branchRepo.findOne({
      where: { id: sale.branchId },
    });
    const _taxRate = Number(branch?.taxRate) || 0.16;

    return this.dataSource
      .transaction(async (em) => {
        const items = await em.find(SaleItem, {
          where: { saleId: id },
        });

        for (const item of items) {
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: item.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId: sale.branchId })
            .andWhere('p.deleted_at IS NULL')
            .getOne();

          if (!part) continue;

          const stockBefore = part.stockQuantity;
          const stockAfter = stockBefore + item.quantity;

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: item.partId,
            branchId: sale.branchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.ADJUSTMENT_IN,
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            referenceId: sale.id,
            referenceType: 'sale',
            notes: `Cancelación venta ${sale.ticketNumber}`,
          });
          await em.save(movement);

          part.stockQuantity = stockAfter;
          await em.save(part);
        }

        const payments = await em.find(SalePayment, {
          where: { saleId: id },
        });

        if (sale.cashSessionId) {
          const session = await em.findOne(CashSession, {
            where: { id: sale.cashSessionId },
          });
          if (session) {
            for (const p of payments) {
              const amount = Number(p.amount);
              if (p.method === SalePaymentMethodEnum.CASH) {
                session.totalCash = Number(session.totalCash) - amount;
              } else if (p.method === SalePaymentMethodEnum.CARD) {
                session.totalCard = Number(session.totalCard) - amount;
              } else if (p.method === SalePaymentMethodEnum.TRANSFER) {
                session.totalTransfer = Number(session.totalTransfer) - amount;
              }
            }
            session.totalSales =
              Number(session.totalSales) - Number(sale.total);
            await em.save(session);
          }
        }

        await em.update(Sale, id, { status: SaleStatusEnum.CANCELLED });
      })
      .then(() => this.findOne(user, id));
  }
}
