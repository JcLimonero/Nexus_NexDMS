import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  PartReturn,
  RefundMethodEnum,
  ReturnKindEnum,
} from './entities/part-return.entity';
import { PartReturnItem } from './entities/part-return-item.entity';
import { CreatePartReturnDto } from './dto/create-part-return.dto';
import { Part } from '../parts/entities/part.entity';
import {
  StockMovement,
  StockMovementTypeEnum,
} from '../stock-movements/entities/stock-movement.entity';
import { CfdiService } from '../cfdi/cfdi.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PartReturnsService {
  constructor(
    @InjectRepository(PartReturn)
    private readonly repo: Repository<PartReturn>,
    @InjectRepository(PartReturnItem)
    private readonly itemRepo: Repository<PartReturnItem>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly dataSource: DataSource,
    private readonly cfdiService: CfdiService,
  ) {}

  async findAll(user: UserPayload, kind?: ReturnKindEnum) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (kind) where.kind = kind;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(user: UserPayload, id: string): Promise<PartReturn> {
    const ret = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['items'],
    });
    if (!ret) {
      throw new NotFoundException(`Devolución ${id} no encontrada`);
    }
    return ret;
  }

  private async generateFolio(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const previos = await this.repo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere("to_char(r.created_at, 'YYYY') = :year", { year: String(year) })
      .getCount();
    return `DEV-${year}-${String(previos + 1).padStart(4, '0')}`;
  }

  /**
   * Registra la devolución/reclamo y aplica el efecto en inventario:
   * - CLIENT_RETURN + restock → reingresa stock (ADJUSTMENT_IN).
   * - SUPPLIER_CLAIM + restock → saca stock hacia el proveedor (ADJUSTMENT_OUT).
   * - restock=false → no toca stock (p. ej. pieza defectuosa apartada).
   */
  async create(
    user: UserPayload,
    dto: CreatePartReturnDto,
  ): Promise<PartReturn> {
    const branchId = dto.branchId ?? user.branchId;
    if (!branchId) {
      throw new BadRequestException('Se requiere sucursal para la devolución');
    }
    if (dto.kind === ReturnKindEnum.CLIENT_RETURN && dto.supplierId) {
      throw new BadRequestException(
        'Una devolución de cliente no lleva proveedor',
      );
    }
    if (dto.kind === ReturnKindEnum.SUPPLIER_CLAIM && dto.clientId) {
      throw new BadRequestException('Un reclamo a proveedor no lleva cliente');
    }

    const partIds = [...new Set(dto.lines.map((l) => l.partId))];
    const parts = await this.partRepo.find({
      where: { id: In(partIds), branchId, tenantId: user.tenantId },
    });
    const partMap = new Map(parts.map((p) => [p.id, p]));
    const missing = partIds.filter((id) => !partMap.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Parte(s) no encontrada(s) en la sucursal: ${missing.join(', ')}`,
      );
    }

    const restock = dto.restock ?? true;
    let refundTotal = 0;
    const linesData = dto.lines.map((line) => {
      const part = partMap.get(line.partId)!;
      const unitPrice = line.unitPrice ?? (Number(part.publicPrice) || 0);
      const subtotal = line.quantity * unitPrice;
      refundTotal += subtotal;
      return {
        partId: line.partId,
        quantity: line.quantity,
        unitPrice,
        subtotal,
        condition: line.condition,
      };
    });

    return this.dataSource
      .transaction(async (em) => {
        const folio = await this.generateFolio(user.tenantId);

        const ret = em.create(PartReturn, {
          tenantId: user.tenantId,
          branchId,
          folio,
          kind: dto.kind,
          clientId: dto.clientId ?? null,
          supplierId: dto.supplierId ?? null,
          isWarranty: dto.isWarranty ?? false,
          restock,
          reason: dto.reason ?? null,
          refundMethod: dto.refundMethod ?? RefundMethodEnum.NONE,
          refundTotal,
          cfdiId: dto.cfdiId ?? null,
          createdBy: user.sub,
        });
        const saved = await em.save(ret);

        for (const line of linesData) {
          await em.save(
            em.create(PartReturnItem, {
              returnId: saved.id,
              partId: line.partId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subtotal: line.subtotal,
              condition: line.condition,
            }),
          );

          if (!restock) continue;

          // Bloqueo de la parte para ajustar stock de forma segura.
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :id', { id: line.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId })
            .getOne();
          if (!part) continue;

          const entra = dto.kind === ReturnKindEnum.CLIENT_RETURN;
          const stockBefore = part.stockQuantity;
          const stockAfter = entra
            ? stockBefore + line.quantity
            : stockBefore - line.quantity;
          if (stockAfter < 0) {
            throw new BadRequestException(
              `Stock insuficiente para sacar ${line.quantity} de la parte ${part.sku}`,
            );
          }

          await em.save(
            em.create(StockMovement, {
              tenantId: user.tenantId,
              partId: line.partId,
              branchId,
              userId: user.sub,
              movementType: entra
                ? StockMovementTypeEnum.ADJUSTMENT_IN
                : StockMovementTypeEnum.ADJUSTMENT_OUT,
              quantity: line.quantity,
              stockBefore,
              stockAfter,
              unitCost: Number(part.averageCost) || 0,
              referenceId: saved.id,
              referenceType: 'part_return',
              notes: `Devolución ${folio}`,
            }),
          );

          part.stockQuantity = stockAfter;
          await em.save(part);
        }

        return saved.id;
      })
      .then((id) => this.findOne(user, id));
  }

  /**
   * Emite la nota de crédito (CFDI de egreso) de una devolución de cliente,
   * relacionándola con el CFDI de la venta original. Delega en el flujo de CFDI.
   */
  async emitirNotaCredito(user: UserPayload, id: string): Promise<PartReturn> {
    const ret = await this.findOne(user, id);
    if (ret.kind !== ReturnKindEnum.CLIENT_RETURN) {
      throw new BadRequestException(
        'Solo las devoluciones de cliente generan nota de crédito',
      );
    }
    if (!ret.cfdiId) {
      throw new BadRequestException(
        'La devolución no tiene ligado el CFDI de la venta original',
      );
    }
    if (ret.notaCreditoCfdiId) {
      throw new BadRequestException(
        'Esta devolución ya tiene una nota de crédito emitida',
      );
    }

    const nc = await this.cfdiService.generarNotaCredito(user, ret.cfdiId, {
      motivo: `Devolución ${ret.folio}`,
      monto: Number(ret.refundTotal) || undefined,
    });

    ret.notaCreditoCfdiId = nc.id;
    await this.repo.save(ret);
    return this.findOne(user, id);
  }
}
