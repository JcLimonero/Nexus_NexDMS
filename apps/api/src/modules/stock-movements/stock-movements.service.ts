import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { Part } from '../parts/entities/part.entity';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { PurchaseEntryDto } from './dto/purchase-entry.dto';
import { FilterStockMovementsDto } from './dto/filter-stock-movements.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { StockMovementTypeEnum } from './entities/stock-movement.entity';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterStockMovementsDto,
  ): Promise<StockMovement[]> {
    if (filters.branchId) {
      await this.branchesService.assertBranchInScope(user, filters.branchId);
    }

    const qb = this.movementRepo
      .createQueryBuilder('sm')
      .where('sm.tenant_id = :tenantId', { tenantId: user.tenantId });

    if (filters.partId) {
      qb.andWhere('sm.part_id = :partId', { partId: filters.partId });
    }
    if (filters.movementType) {
      qb.andWhere('sm.movement_type = :movementType', {
        movementType: filters.movementType,
      });
    }
    if (filters.branchId) {
      qb.andWhere('sm.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('sm.created_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('sm.created_at <= :dateTo', {
        dateTo: `${filters.dateTo}T23:59:59.999Z`,
      });
    }

    return qb.orderBy('sm.created_at', 'DESC').take(100).getMany();
  }

  async createAdjustment(
    user: UserPayload,
    dto: CreateAdjustmentDto,
  ): Promise<StockMovement> {
    if (
      dto.type !== StockMovementTypeEnum.ADJUSTMENT_IN &&
      dto.type !== StockMovementTypeEnum.ADJUSTMENT_OUT
    ) {
      throw new BadRequestException(
        'Tipo debe ser ADJUSTMENT_IN o ADJUSTMENT_OUT',
      );
    }
    await this.branchesService.assertBranchInScope(user, dto.branchId);

    return this.partRepo.manager.transaction(async (em) => {
      const part = await em
        .createQueryBuilder(Part, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :partId', { partId: dto.partId })
        .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
        .andWhere('p.branch_id = :branchId', { branchId: dto.branchId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();

      if (!part) {
        throw new NotFoundException(
          `Parte ${dto.partId} no encontrada en la sucursal`,
        );
      }

      const stockBefore = part.stockQuantity;
      let stockAfter: number;

      if (dto.type === StockMovementTypeEnum.ADJUSTMENT_IN) {
        stockAfter = stockBefore + dto.quantity;
      } else {
        stockAfter = stockBefore - dto.quantity;
        if (stockAfter < 0) {
          throw new BadRequestException(
            `Stock insuficiente. Actual: ${stockBefore}, solicitado: ${dto.quantity}`,
          );
        }
      }

      const movement = em.create(StockMovement, {
        tenantId: user.tenantId,
        partId: dto.partId,
        branchId: dto.branchId,
        userId: user.sub,
        movementType: dto.type,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        notes: dto.notes ?? null,
      });
      await em.save(movement);

      part.stockQuantity = stockAfter;
      await em.save(part);

      return movement;
    });
  }

  /**
   * Entrada de compra con costeo. Suma existencias y recalcula el costo
   * promedio ponderado:
   *
   *   nuevoProm = (stockPrevio·promPrevio + entra·costoEntra) / (stockPrevio + entra)
   *
   * Si el stock previo era cero (o negativo), el promedio pasa a ser el costo
   * de esta entrada. También se guarda el costo como "último precio de compra".
   */
  async registrarEntrada(
    user: UserPayload,
    dto: PurchaseEntryDto,
  ): Promise<StockMovement> {
    await this.branchesService.assertBranchInScope(user, dto.branchId);

    return this.partRepo.manager.transaction(async (em) => {
      const part = await em
        .createQueryBuilder(Part, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :partId', { partId: dto.partId })
        .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
        .andWhere('p.branch_id = :branchId', { branchId: dto.branchId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();

      if (!part) {
        throw new NotFoundException(
          `Parte ${dto.partId} no encontrada en la sucursal`,
        );
      }

      const stockBefore = part.stockQuantity;
      const stockAfter = stockBefore + dto.quantity;
      const avgBefore = Number(part.averageCost) || 0;

      const nuevoProm =
        stockBefore > 0
          ? (stockBefore * avgBefore + dto.quantity * dto.unitCost) / stockAfter
          : dto.unitCost;

      const movement = em.create(StockMovement, {
        tenantId: user.tenantId,
        partId: dto.partId,
        branchId: dto.branchId,
        userId: user.sub,
        movementType: StockMovementTypeEnum.PURCHASE_IN,
        quantity: dto.quantity,
        stockBefore,
        stockAfter,
        unitCost: dto.unitCost,
        notes: dto.notes ?? null,
      });
      await em.save(movement);

      part.stockQuantity = stockAfter;
      part.averageCost = Math.round(nuevoProm * 100) / 100;
      part.purchasePrice = dto.unitCost;
      await em.save(part);

      return movement;
    });
  }

  /**
   * Valuación del inventario a costo promedio: por cada parte con existencia,
   * su valor (existencia · costo) y el margen contra el precio público, más los
   * totales de la sucursal.
   */
  async valuation(
    user: UserPayload,
    branchId: string,
  ): Promise<{
    items: Array<{
      partId: string;
      sku: string;
      name: string;
      stockQuantity: number;
      averageCost: number;
      value: number;
      publicPrice: number;
      marginPct: number | null;
    }>;
    totals: {
      parts: number;
      units: number;
      costValue: number;
      retailValue: number;
    };
  }> {
    await this.branchesService.assertBranchInScope(user, branchId);

    const parts = await this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.branch_id = :branchId', { branchId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('p.is_active = true')
      .orderBy('p.name', 'ASC')
      .getMany();

    let units = 0;
    let costValue = 0;
    let retailValue = 0;

    const items = parts.map((p) => {
      const stock = p.stockQuantity;
      const avg = Number(p.averageCost) || 0;
      const pub = Number(p.publicPrice) || 0;
      const value = Math.round(stock * avg * 100) / 100;
      units += stock;
      costValue += value;
      retailValue += stock * pub;
      const marginPct = pub > 0 ? Math.round(((pub - avg) / pub) * 1000) / 10 : null;
      return {
        partId: p.id,
        sku: p.sku,
        name: p.name,
        stockQuantity: stock,
        averageCost: avg,
        value,
        publicPrice: pub,
        marginPct,
      };
    });

    return {
      items,
      totals: {
        parts: items.length,
        units,
        costValue: Math.round(costValue * 100) / 100,
        retailValue: Math.round(retailValue * 100) / 100,
      },
    };
  }
}
