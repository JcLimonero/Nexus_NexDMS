import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrderStatusEnum } from './entities/purchase-order.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { FilterPurchaseOrdersDto } from './dto/filter-purchase-orders.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { In } from 'typeorm';
import { ScopeEnum } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly itemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly dataSource: DataSource,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<PurchaseOrder>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('po.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = po.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async assertInScope(
    user: UserPayload,
    order: PurchaseOrder,
  ): Promise<void> {
    const qb = this.orderRepo
      .createQueryBuilder('po')
      .where('po.id = :id', { id: order.id })
      .andWhere('po.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Orden de compra ${order.id} no encontrada`);
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'WAREHOUSE'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo WAREHOUSE y ADMIN pueden crear o modificar órdenes de compra',
      );
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterPurchaseOrdersDto,
  ): Promise<{
    data: PurchaseOrder[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .where('po.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.supplierId) {
      qb.andWhere('po.supplier_id = :supplierId', {
        supplierId: filters.supplierId,
      });
    }
    if (filters.status) {
      qb.andWhere('po.status = :status', { status: filters.status });
    }
    if (filters.branchId) {
      qb.andWhere('po.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('po.ordered_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('po.ordered_at <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    const [data, total] = await qb
      .orderBy('po.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<PurchaseOrder> {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['items', 'items.part'],
    });
    if (!order) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }
    await this.assertInScope(user, order);
    return order;
  }

  private async generateFolio(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO purchase_order_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = purchase_order_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `OC-${year}-${String(seq).padStart(4, '0')}`;
  }

  async create(
    user: UserPayload,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    this.assertCanWrite(user);

    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una línea');
    }

    const [branch, supplier] = await Promise.all([
      this.branchRepo.findOne({
        where: { id: dto.branchId, tenantId: user.tenantId },
      }),
      this.supplierRepo.findOne({
        where: { id: dto.supplierId, tenantId: user.tenantId },
      }),
    ]);
    if (!branch) {
      throw new NotFoundException(`Sucursal ${dto.branchId} no encontrada`);
    }
    if (!supplier) {
      throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);
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
    const foundPartIds = new Set(parts.map((p) => p.id));
    const missing = partIds.filter((id) => !foundPartIds.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Parte(s) no encontrada(s) en la sucursal: ${missing.join(', ')}`,
      );
    }

    let subtotal = 0;
    const linesData = dto.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      subtotal += lineSubtotal;
      return {
        partId: line.partId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: lineSubtotal,
      };
    });

    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + taxAmount;

    return this.dataSource
      .transaction(async (em) => {
        const folio = await this.generateFolio(user.tenantId, em);

        const order = em.create(PurchaseOrder, {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          userId: user.sub,
          folio,
          status: PurchaseOrderStatusEnum.DRAFT,
          subtotal,
          taxAmount,
          total,
          orderedAt: new Date(dto.orderedAt),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          notes: dto.notes ?? null,
        });
        const savedOrder = await em.save(order);

        for (const line of linesData) {
          const item = em.create(PurchaseOrderItem, {
            purchaseOrderId: savedOrder.id,
            partId: line.partId,
            quantity: line.quantity,
            quantityReceived: 0,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          });
          await em.save(item);
        }

        return savedOrder.id;
      })
      .then((id) => this.findOne(user, id));
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    this.assertCanWrite(user);

    const order = await this.findOne(user, id);
    if (order.status !== PurchaseOrderStatusEnum.DRAFT) {
      throw new BadRequestException(
        'Solo se puede editar una orden en estado DRAFT',
      );
    }

    const updates: Partial<PurchaseOrder> = {};
    if (dto.orderedAt !== undefined)
      updates.orderedAt = new Date(dto.orderedAt);
    if (dto.expectedAt !== undefined) {
      updates.expectedAt = dto.expectedAt ? new Date(dto.expectedAt) : null;
    }
    if (dto.notes !== undefined) updates.notes = dto.notes;

    if (dto.lines !== undefined) {
      if (!dto.lines.length) {
        throw new BadRequestException('Debe incluir al menos una línea');
      }

      const partIds = [...new Set(dto.lines.map((l) => l.partId))];
      const parts = await this.partRepo.find({
        where: {
          id: In(partIds),
          branchId: order.branchId,
          tenantId: user.tenantId,
        },
      });
      const foundPartIds = new Set(parts.map((p) => p.id));
      const missing = partIds.filter((id) => !foundPartIds.has(id));
      if (missing.length) {
        throw new NotFoundException(
          `Parte(s) no encontrada(s) en la sucursal: ${missing.join(', ')}`,
        );
      }

      const branch = await this.branchRepo.findOne({
        where: { id: order.branchId },
      });
      const taxRate = Number(branch?.taxRate) || 0.16;

      let subtotal = 0;
      const linesData = dto.lines.map((line) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        subtotal += lineSubtotal;
        return {
          partId: line.partId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: lineSubtotal,
        };
      });
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
      const total = subtotal + taxAmount;

      Object.assign(order, {
        ...updates,
        subtotal,
        taxAmount,
        total,
      });
      await this.orderRepo.save(order);

      await this.itemRepo.delete({ purchaseOrderId: id });
      for (const line of linesData) {
        const item = this.itemRepo.create({
          purchaseOrderId: id,
          partId: line.partId,
          quantity: line.quantity,
          quantityReceived: 0,
          unitPrice: line.unitPrice,
          subtotal: line.subtotal,
        });
        await this.itemRepo.save(item);
      }
    } else if (Object.keys(updates).length > 0) {
      Object.assign(order, updates);
      await this.orderRepo.save(order);
    }

    return this.findOne(user, id);
  }

  async send(user: UserPayload, id: string): Promise<PurchaseOrder> {
    this.assertCanWrite(user);

    const order = await this.findOne(user, id);
    if (order.status !== PurchaseOrderStatusEnum.DRAFT) {
      throw new BadRequestException(
        'Solo se puede enviar una orden en estado DRAFT',
      );
    }

    const itemCount = await this.itemRepo.count({
      where: { purchaseOrderId: id },
    });
    if (itemCount === 0) {
      throw new BadRequestException(
        'La orden debe tener al menos una línea para enviarse',
      );
    }

    order.status = PurchaseOrderStatusEnum.SENT;
    await this.orderRepo.save(order);
    return this.findOne(user, id);
  }

  async receive(
    user: UserPayload,
    id: string,
    dto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    this.assertCanWrite(user);

    const order = await this.findOne(user, id);
    if (order.status === PurchaseOrderStatusEnum.CANCELLED) {
      throw new BadRequestException('No se puede recibir una orden cancelada');
    }
    if (order.status === PurchaseOrderStatusEnum.DRAFT) {
      throw new BadRequestException(
        'Debe enviar la orden antes de recibir mercancía',
      );
    }

    const items = await this.itemRepo.find({
      where: { purchaseOrderId: id },
      order: { id: 'ASC' },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    for (const line of dto.lines) {
      const item = itemMap.get(line.itemId);
      if (!item) {
        throw new BadRequestException(
          `Línea ${line.itemId} no pertenece a esta orden`,
        );
      }
      const remaining = item.quantity - item.quantityReceived;
      if (line.quantityReceived > remaining || line.quantityReceived < 1) {
        throw new BadRequestException(
          `Cantidad inválida para línea ${line.itemId}: máximo ${remaining} pendientes`,
        );
      }
    }

    return this.dataSource
      .transaction(async (em) => {
        for (const line of dto.lines) {
          const item = await em.findOne(PurchaseOrderItem, {
            where: { id: line.itemId, purchaseOrderId: id },
          });
          if (!item) continue;

          const newReceived = item.quantityReceived + line.quantityReceived;
          item.quantityReceived = newReceived;
          await em.save(item);

          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: item.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId: order.branchId })
            .andWhere('p.deleted_at IS NULL')
            .getOne();

          if (!part) {
            throw new NotFoundException(
              `Parte ${item.partId} no encontrada en la sucursal`,
            );
          }

          const stockBefore = part.stockQuantity;
          const stockAfter = stockBefore + line.quantityReceived;

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: item.partId,
            branchId: order.branchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.PURCHASE_IN,
            quantity: line.quantityReceived,
            stockBefore,
            stockAfter,
            referenceId: order.id,
            referenceType: 'purchase_order',
            notes: dto.notes ?? null,
          });
          await em.save(movement);

          part.stockQuantity = stockAfter;
          await em.save(part);
        }

        const updatedItems = await em.find(PurchaseOrderItem, {
          where: { purchaseOrderId: id },
        });

        const allComplete = updatedItems.every(
          (i) => i.quantityReceived >= i.quantity,
        );
        const anyPartial = updatedItems.some(
          (i) => i.quantityReceived > 0 && i.quantityReceived < i.quantity,
        );

        let newStatus = order.status;
        if (allComplete) {
          newStatus = PurchaseOrderStatusEnum.RECEIVED;
        } else if (anyPartial) {
          newStatus = PurchaseOrderStatusEnum.PARTIAL;
        }

        await em.update(PurchaseOrder, id, {
          status: newStatus,
          receivedAt: allComplete ? new Date() : undefined,
        });
      })
      .then(() => this.findOne(user, id));
  }

  async cancel(
    user: UserPayload,
    id: string,
    dto?: { reason?: string },
  ): Promise<PurchaseOrder> {
    this.assertCanWrite(user);

    const order = await this.findOne(user, id);
    if (
      order.status !== PurchaseOrderStatusEnum.DRAFT &&
      order.status !== PurchaseOrderStatusEnum.SENT
    ) {
      throw new BadRequestException(
        'Solo se puede cancelar una orden en estado DRAFT o SENT',
      );
    }

    order.status = PurchaseOrderStatusEnum.CANCELLED;
    if (dto?.reason) {
      order.notes = order.notes
        ? `${order.notes}\n[Cancelación: ${dto.reason}]`
        : `[Cancelación: ${dto.reason}]`;
    }
    await this.orderRepo.save(order);
    return this.findOne(user, id);
  }
}
