import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  StockCount,
  StockCountStatusEnum,
} from './entities/stock-count.entity';
import { StockCountLine } from './entities/stock-count-line.entity';
import { Part } from '../parts/entities/part.entity';
import {
  StockMovement,
  StockMovementTypeEnum,
} from '../stock-movements/entities/stock-movement.entity';
import { BranchesService } from '../branches/branches.service';
import { OpenCountDto } from './dto/open-count.dto';
import { SaveCountsDto } from './dto/save-counts.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class StockCountsService {
  constructor(
    @InjectRepository(StockCount)
    private readonly countRepo: Repository<StockCount>,
    @InjectRepository(StockCountLine)
    private readonly lineRepo: Repository<StockCountLine>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Abre un conteo y congela en renglones las existencias del sistema de todas
   * las partes activas de la sucursal.
   */
  async open(user: UserPayload, dto: OpenCountDto): Promise<StockCount> {
    await this.branchesService.assertBranchInScope(user, dto.branchId);

    const abierto = await this.countRepo.findOne({
      where: {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        status: StockCountStatusEnum.OPEN,
      },
    });
    if (abierto) {
      throw new BadRequestException(
        'Ya hay un conteo abierto en esta sucursal; ciérralo o cancélalo antes de abrir otro',
      );
    }

    const parts = await this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.branch_id = :branchId', { branchId: dto.branchId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('p.is_active = true')
      .orderBy('p.name', 'ASC')
      .getMany();

    if (parts.length === 0) {
      throw new BadRequestException(
        'La sucursal no tiene partes activas que contar',
      );
    }

    return this.countRepo.manager.transaction(async (em) => {
      const folio = await this.generarFolio(em, user.tenantId);
      const count = em.create(StockCount, {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        folio,
        status: StockCountStatusEnum.OPEN,
        notes: dto.notes ?? null,
        createdById: user.sub,
      });
      await em.save(count);

      const lines = parts.map((p) =>
        em.create(StockCountLine, {
          countId: count.id,
          partId: p.id,
          sku: p.sku,
          name: p.name,
          systemQty: p.stockQuantity,
          countedQty: null,
          difference: null,
        }),
      );
      await em.save(lines);
      count.lines = lines;
      return count;
    });
  }

  private async generarFolio(
    em: EntityManager,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const previos = await em
      .createQueryBuilder(StockCount, 'c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.folio LIKE :like', { like: `CF-${year}-%` })
      .getCount();
    return `CF-${year}-${String(previos + 1).padStart(4, '0')}`;
  }

  async findAll(user: UserPayload, branchId?: string): Promise<StockCount[]> {
    const qb = this.countRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId: user.tenantId });
    if (branchId) {
      await this.branchesService.assertBranchInScope(user, branchId);
      qb.andWhere('c.branch_id = :branchId', { branchId });
    }
    return qb.orderBy('c.created_at', 'DESC').take(100).getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<StockCount> {
    const count = await this.countRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['lines'],
    });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    // Renglones ordenados por nombre para captura cómoda.
    count.lines = (count.lines ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return count;
  }

  /** Guarda cantidades contadas y recalcula diferencias. No afecta stock. */
  async saveCounts(
    user: UserPayload,
    id: string,
    dto: SaveCountsDto,
  ): Promise<StockCount> {
    const count = await this.countRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['lines'],
    });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    if (count.status !== StockCountStatusEnum.OPEN) {
      throw new BadRequestException('El conteo ya no está abierto');
    }

    const porId = new Map((count.lines ?? []).map((l) => [l.id, l]));
    for (const entrada of dto.lines) {
      const line = porId.get(entrada.lineId);
      if (!line) continue; // renglón ajeno a este conteo: se ignora
      line.countedQty = entrada.countedQty;
      line.difference = entrada.countedQty - line.systemQty;
    }
    await this.lineRepo.save([...porId.values()]);
    return this.findOne(user, id);
  }

  /**
   * Aplica el conteo: por cada renglón contado cuya diferencia no sea cero, crea
   * un ajuste de entrada/salida y deja la existencia igual a lo contado. Los
   * renglones sin capturar se dejan como están (no se tocan).
   */
  async apply(user: UserPayload, id: string): Promise<StockCount> {
    return this.countRepo.manager.transaction(async (em) => {
      const count = await em.findOne(StockCount, {
        where: { id, tenantId: user.tenantId },
        relations: ['lines'],
      });
      if (!count) throw new NotFoundException('Conteo no encontrado');
      if (count.status !== StockCountStatusEnum.OPEN) {
        throw new BadRequestException('El conteo ya no está abierto');
      }

      const conteados = (count.lines ?? []).filter(
        (l) => l.countedQty !== null && l.countedQty !== l.systemQty,
      );

      for (const line of conteados) {
        const part = await em
          .createQueryBuilder(Part, 'p')
          .setLock('pessimistic_write')
          .where('p.id = :partId', { partId: line.partId })
          .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
          .andWhere('p.deleted_at IS NULL')
          .getOne();
        if (!part) continue; // la parte se borró tras abrir el conteo

        const stockBefore = part.stockQuantity;
        const contado = line.countedQty as number;
        const delta = contado - stockBefore;
        if (delta === 0) continue;

        const movement = em.create(StockMovement, {
          tenantId: user.tenantId,
          partId: part.id,
          branchId: count.branchId,
          userId: user.sub,
          movementType:
            delta > 0
              ? StockMovementTypeEnum.ADJUSTMENT_IN
              : StockMovementTypeEnum.ADJUSTMENT_OUT,
          quantity: Math.abs(delta),
          stockBefore,
          stockAfter: contado,
          referenceId: count.id,
          referenceType: 'StockCount',
          notes: `Conteo físico ${count.folio}`,
        });
        await em.save(movement);

        part.stockQuantity = contado;
        await em.save(part);
      }

      count.status = StockCountStatusEnum.APPLIED;
      count.appliedById = user.sub;
      count.appliedAt = new Date();
      await em.save(count);
      return count;
    });
  }

  async cancel(user: UserPayload, id: string): Promise<StockCount> {
    const count = await this.countRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    if (count.status !== StockCountStatusEnum.OPEN) {
      throw new BadRequestException('Solo se puede cancelar un conteo abierto');
    }
    count.status = StockCountStatusEnum.CANCELLED;
    return this.countRepo.save(count);
  }
}
