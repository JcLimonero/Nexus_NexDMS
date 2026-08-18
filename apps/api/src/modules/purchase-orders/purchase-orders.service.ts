import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { XMLParser } from 'fast-xml-parser';
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
import { PartSupplier } from '../parts/entities/part-supplier.entity';
import { PartEquivalence } from '../parts/entities/part-equivalence.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';
import { BranchesService } from '../branches/branches.service';

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
    @InjectRepository(PartSupplier)
    private readonly partSupplierRepo: Repository<PartSupplier>,
    @InjectRepository(PartEquivalence)
    private readonly partEquivalenceRepo: Repository<PartEquivalence>,
    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
  ) {}

  /** Registra/actualiza el precio de una parte para un proveedor (top 3). */
  private async registrarPrecioProveedor(
    em: EntityManager,
    tenantId: string,
    partId: string,
    supplierId: string,
    price: number,
  ): Promise<void> {
    const hoy = new Date().toISOString().slice(0, 10);
    const existing = await em.findOne(PartSupplier, {
      where: { partId, supplierId },
    });
    if (existing) {
      existing.lastPrice = price;
      existing.lastPurchasedAt = hoy;
      existing.timesPurchased = existing.timesPurchased + 1;
      await em.save(existing);
      return;
    }
    const ps = em.create(PartSupplier, {
      tenantId,
      partId,
      supplierId,
      lastPrice: price,
      lastPurchasedAt: hoy,
      timesPurchased: 1,
    });
    await em.save(ps);
  }

  private applyScope(
    qb: ReturnType<Repository<PurchaseOrder>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        if (!user.branchId) {
          qb.andWhere('1 = 0');
          return;
        }
        qb.andWhere('po.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin(Branch, 'b', 'b.id = po.branch_id').andWhere(
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
      .orderBy('po.createdAt', 'DESC')
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

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    const [branch, supplier] = await Promise.all([
      this.branchRepo.findOne({
        where: { id: dto.branchId, tenantId: user.tenantId },
      }),
      this.supplierRepo.findOne({
        where: { id: dto.supplierId, tenantId: user.tenantId },
      }),
    ]);
    if (!supplier) {
      throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);
    }

    const taxRate = Number(branch?.taxRate) || 0.16;

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
          const unitCost = Number(item.unitPrice) || 0;

          // Costo promedio ponderado (igual que la entrada manual de almacén):
          // recibir por orden de compra ahora sí actualiza el costeo.
          const avgBefore = Number(part.averageCost) || 0;
          const nuevoProm =
            stockBefore > 0
              ? (stockBefore * avgBefore + line.quantityReceived * unitCost) /
                stockAfter
              : unitCost;

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: item.partId,
            branchId: order.branchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.PURCHASE_IN,
            quantity: line.quantityReceived,
            stockBefore,
            stockAfter,
            unitCost,
            referenceId: order.id,
            referenceType: 'purchase_order',
            notes: dto.notes ?? null,
          });
          await em.save(movement);

          part.stockQuantity = stockAfter;
          part.averageCost = Math.round(nuevoProm * 100) / 100;
          part.purchasePrice = unitCost;
          if (!part.preferredSupplierId) {
            part.preferredSupplierId = order.supplierId;
          }
          await em.save(part);

          // Historial de precio por proveedor (base del top 3).
          await this.registrarPrecioProveedor(
            em,
            user.tenantId,
            item.partId,
            order.supplierId,
            unitCost,
          );
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

  // ─── Top 3 de proveedores por refacción ─────────────────────

  /** Los 3 proveedores más recientes de una parte, con su último precio. */
  async topProveedores(user: UserPayload, partId: string) {
    const rows = await this.partSupplierRepo
      .createQueryBuilder('ps')
      .innerJoin(Supplier, 's', 's.id = ps.supplier_id')
      .select([
        'ps.supplier_id AS "supplierId"',
        's.name AS "supplierName"',
        'ps.last_price AS "lastPrice"',
        'ps.last_purchased_at AS "lastPurchasedAt"',
        'ps.times_purchased AS "timesPurchased"',
        'ps.supplier_sku AS "supplierSku"',
        'ps.warranty_months AS "warrantyMonths"',
        'ps.warranty_note AS "warrantyNote"',
      ])
      .where('ps.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('ps.part_id = :partId', { partId })
      .orderBy('ps.last_purchased_at', 'DESC', 'NULLS LAST')
      .addOrderBy('ps.times_purchased', 'DESC')
      .limit(3)
      .getRawMany();
    return rows;
  }

  /**
   * Registra la garantía que un proveedor otorga sobre una refacción. Si aún
   * no hay historial de ese proveedor para la parte, crea la relación.
   */
  async setSupplierWarranty(
    user: UserPayload,
    partId: string,
    dto: {
      supplierId: string;
      warrantyMonths?: number | null;
      warrantyNote?: string | null;
    },
  ): Promise<PartSupplier> {
    const part = await this.partRepo.findOne({
      where: { id: partId, tenantId: user.tenantId },
    });
    if (!part) {
      throw new NotFoundException(`Parte ${partId} no encontrada`);
    }
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, tenantId: user.tenantId },
    });
    if (!supplier) {
      throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);
    }
    let ps = await this.partSupplierRepo.findOne({
      where: { partId, supplierId: dto.supplierId },
    });
    if (!ps) {
      ps = this.partSupplierRepo.create({
        tenantId: user.tenantId,
        partId,
        supplierId: dto.supplierId,
        lastPrice: 0,
        timesPurchased: 0,
      });
    }
    ps.warrantyMonths = dto.warrantyMonths ?? null;
    ps.warrantyNote = dto.warrantyNote ?? null;
    return this.partSupplierRepo.save(ps);
  }

  // ─── Importar factura de compra (CFDI XML) ──────────────────

  /**
   * Crea una orden de compra en borrador a partir del XML del CFDI del
   * proveedor: empareja el emisor por RFC y los conceptos por SKU (o
   * equivalencia). Devuelve la orden creada y los conceptos no emparejados.
   */
  async importarCfdiXml(
    user: UserPayload,
    branchId: string,
    xml: string,
  ): Promise<{
    order: PurchaseOrder;
    emparejados: number;
    noEmparejados: { sku: string; descripcion: string; cantidad: number }[];
  }> {
    this.assertCanWrite(user);
    await this.branchesService.assertBranchInScope(user, branchId);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
    });
    let doc: Record<string, any>;
    try {
      doc = parser.parse(xml) as Record<string, any>;
    } catch {
      throw new BadRequestException('El archivo no es un XML válido');
    }

    const comp = doc?.Comprobante;
    if (!comp) {
      throw new BadRequestException('El XML no parece un CFDI (falta Comprobante)');
    }

    const rfc: string | undefined = comp?.Emisor?.['@_Rfc'];
    const nombre: string | undefined = comp?.Emisor?.['@_Nombre'];
    if (!rfc) {
      throw new BadRequestException('El CFDI no trae RFC del emisor');
    }

    const supplier = await this.supplierRepo.findOne({
      where: { tenantId: user.tenantId, rfc },
    });
    if (!supplier) {
      throw new BadRequestException(
        `No hay proveedor con RFC ${rfc}${nombre ? ` (${nombre})` : ''}. ` +
          'Regístralo antes de importar su factura.',
      );
    }

    const uuid: string | undefined =
      comp?.Complemento?.TimbreFiscalDigital?.['@_UUID'];

    const rawConceptos = comp?.Conceptos?.Concepto;
    const conceptos: any[] = Array.isArray(rawConceptos)
      ? rawConceptos
      : rawConceptos
        ? [rawConceptos]
        : [];
    if (!conceptos.length) {
      throw new BadRequestException('El CFDI no tiene conceptos');
    }

    // Equivalencias del tenant para resolver SKUs alternos → part.
    const equivs = await this.partEquivalenceRepo.find({
      where: { tenantId: user.tenantId },
    });
    const equivMap = new Map(
      equivs.map((e) => [e.equivalentSku.toUpperCase(), e.partId]),
    );

    const lines: { partId: string; quantity: number; unitPrice: number }[] = [];
    const noEmparejados: {
      sku: string;
      descripcion: string;
      cantidad: number;
    }[] = [];

    for (const c of conceptos) {
      const sku: string = String(c?.['@_NoIdentificacion'] ?? '').trim();
      const descripcion: string = String(c?.['@_Descripcion'] ?? '').trim();
      const cantidad = Number(c?.['@_Cantidad']) || 0;
      const valorUnitario = Number(c?.['@_ValorUnitario']) || 0;
      if (cantidad <= 0) continue;

      let part: Part | null = null;
      if (sku) {
        part = await this.partRepo.findOne({
          where: { sku, branchId, tenantId: user.tenantId },
        });
        if (!part) {
          const equivPartId = equivMap.get(sku.toUpperCase());
          if (equivPartId) {
            part = await this.partRepo.findOne({
              where: { id: equivPartId, branchId, tenantId: user.tenantId },
            });
          }
        }
      }

      if (part) {
        lines.push({
          partId: part.id,
          quantity: Math.round(cantidad),
          unitPrice: valorUnitario,
        });
      } else {
        noEmparejados.push({ sku, descripcion, cantidad });
      }
    }

    if (!lines.length) {
      throw new BadRequestException(
        'Ningún concepto del CFDI coincide con refacciones de la sucursal ' +
          '(por SKU o equivalencia). Registra las partes o sus equivalencias.',
      );
    }

    const fecha: string =
      (comp?.['@_Fecha'] as string)?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);

    const order = await this.create(user, {
      branchId,
      supplierId: supplier.id,
      orderedAt: fecha,
      notes: uuid ? `Importada de CFDI ${uuid}` : 'Importada de CFDI',
      lines,
    });

    if (uuid) {
      await this.orderRepo.update(order.id, { supplierInvoiceUuid: uuid });
    }

    return {
      order: await this.findOne(user, order.id),
      emparejados: lines.length,
      noEmparejados,
    };
  }
}
