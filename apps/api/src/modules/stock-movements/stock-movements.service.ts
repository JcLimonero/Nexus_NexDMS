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
import { FilterStockMovementsDto } from './dto/filter-stock-movements.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { StockMovementTypeEnum } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterStockMovementsDto,
  ): Promise<StockMovement[]> {
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
}
