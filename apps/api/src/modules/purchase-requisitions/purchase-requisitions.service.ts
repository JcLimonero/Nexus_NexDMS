import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PurchaseRequisition,
  RequisitionStatusEnum,
} from './entities/purchase-requisition.entity';
import {
  ConvertRequisitionsDto,
  CreateRequisitionDto,
} from './dto/requisition.dto';
import { Part } from '../parts/entities/part.entity';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PurchaseRequisitionsService {
  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly repo: Repository<PurchaseRequisition>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  /** Cola de "por pedir"; por defecto solo pendientes. */
  async findAll(user: UserPayload, status?: RequisitionStatusEnum) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (status) where.status = status;
    const reqs = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    if (!reqs.length) return [];

    // Se anexa nombre/SKU de la parte para que la lista sea legible.
    const partIds = [...new Set(reqs.map((r) => r.partId))];
    const parts = await this.partRepo.find({ where: { id: In(partIds) } });
    const partMap = new Map(parts.map((p) => [p.id, p]));
    return reqs.map((r) => {
      const p = partMap.get(r.partId);
      return {
        ...r,
        partSku: p?.sku ?? null,
        partName: p?.name ?? null,
        preferredSupplierId: p?.preferredSupplierId ?? null,
      };
    });
  }

  async create(
    user: UserPayload,
    dto: CreateRequisitionDto,
  ): Promise<PurchaseRequisition> {
    const branchId = dto.branchId ?? user.branchId;
    if (!branchId) {
      throw new BadRequestException('Se requiere sucursal para la requisición');
    }
    const part = await this.partRepo.findOne({
      where: { id: dto.partId, tenantId: user.tenantId },
    });
    if (!part) {
      throw new NotFoundException(`Parte ${dto.partId} no encontrada`);
    }
    const req = this.repo.create({
      tenantId: user.tenantId,
      branchId,
      partId: dto.partId,
      quantity: dto.quantity,
      status: RequisitionStatusEnum.PENDING,
      sourceType: 'manual',
      note: dto.note ?? null,
      requestedBy: user.sub,
    });
    return this.repo.save(req);
  }

  async cancel(user: UserPayload, id: string): Promise<PurchaseRequisition> {
    const req = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!req) {
      throw new NotFoundException(`Requisición ${id} no encontrada`);
    }
    if (req.status === RequisitionStatusEnum.ORDERED) {
      throw new BadRequestException(
        'No se puede cancelar una requisición ya ordenada',
      );
    }
    req.status = RequisitionStatusEnum.CANCELLED;
    return this.repo.save(req);
  }

  /**
   * Convierte requisiciones pendientes (de una misma sucursal) en una orden de
   * compra en borrador y las marca como ORDERED.
   */
  async convertToOrder(user: UserPayload, dto: ConvertRequisitionsDto) {
    const reqs = await this.repo.find({
      where: {
        id: In(dto.requisitionIds),
        tenantId: user.tenantId,
        status: RequisitionStatusEnum.PENDING,
      },
    });
    if (!reqs.length) {
      throw new BadRequestException(
        'No hay requisiciones pendientes con esos ids',
      );
    }
    const branches = new Set(reqs.map((r) => r.branchId));
    if (branches.size > 1) {
      throw new BadRequestException(
        'Las requisiciones deben ser de la misma sucursal',
      );
    }
    const branchId = reqs[0].branchId;

    // Agrupa por parte (suma cantidades) y toma el último precio de compra.
    const parts = await this.partRepo.find({
      where: { id: In(reqs.map((r) => r.partId)) },
    });
    const partMap = new Map(parts.map((p) => [p.id, p]));
    const porParte = new Map<string, number>();
    for (const r of reqs) {
      porParte.set(r.partId, (porParte.get(r.partId) ?? 0) + r.quantity);
    }
    const lines = [...porParte.entries()].map(([partId, quantity]) => ({
      partId,
      quantity,
      unitPrice: Number(partMap.get(partId)?.purchasePrice) || 0,
    }));

    const order = await this.purchaseOrdersService.create(user, {
      branchId,
      supplierId: dto.supplierId,
      orderedAt: new Date().toISOString().slice(0, 10),
      notes: 'Generada desde requisiciones',
      lines,
    });

    await this.repo.update(
      { id: In(reqs.map((r) => r.id)) },
      { status: RequisitionStatusEnum.ORDERED, purchaseOrderId: order.id },
    );

    return { order, requisiciones: reqs.length };
  }
}
