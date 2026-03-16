import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';
import { WarehouseTransfer } from './entities/warehouse-transfer.entity';
import {
  WarehouseTransferStatusEnum,
  WarehouseTransferTypeEnum,
} from './entities/warehouse-transfer.entity';
import { WarehouseTransferItem } from './entities/warehouse-transfer-item.entity';
import { CreateWarehouseTransferDto } from './dto/create-warehouse-transfer.dto';
import { UpdateWarehouseTransferDto } from './dto/update-warehouse-transfer.dto';
import { FilterWarehouseTransfersDto } from './dto/filter-warehouse-transfers.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class WarehouseTransfersService {
  constructor(
    @InjectRepository(WarehouseTransfer)
    private readonly transferRepo: Repository<WarehouseTransfer>,
    @InjectRepository(WarehouseTransferItem)
    private readonly itemRepo: Repository<WarehouseTransferItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<WarehouseTransfer>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere(
          '(wt.origin_branch_id = :branchId OR wt.destination_branch_id = :branchId)',
          { branchId: user.branchId },
        );
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.andWhere(
          `(EXISTS (SELECT 1 FROM branches b WHERE b.id = wt.origin_branch_id AND b.legal_entity_id = :legalEntityId)
           OR EXISTS (SELECT 1 FROM branches b2 WHERE b2.id = wt.destination_branch_id AND b2.legal_entity_id = :legalEntityId))`,
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async assertInScope(
    user: UserPayload,
    transfer: WarehouseTransfer,
  ): Promise<void> {
    const qb = this.transferRepo
      .createQueryBuilder('wt')
      .where('wt.id = :id', { id: transfer.id })
      .andWhere('wt.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Transferencia ${transfer.id} no encontrada`);
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'WAREHOUSE'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo WAREHOUSE y ADMIN pueden crear o modificar transferencias',
      );
    }
  }

  private canApprove(user: UserPayload, transfer: WarehouseTransfer): boolean {
    if (
      ['SUPERADMIN', 'ADMIN'].some((r) => user.roles?.includes(r)) &&
      user.scope === ScopeEnum.GLOBAL
    ) {
      return true;
    }
    if (transfer.type === WarehouseTransferTypeEnum.INTRA_BRAND) {
      return (
        user.roles?.includes('MANAGER') &&
        user.scope === ScopeEnum.LEGAL_ENTITY &&
        !!user.legalEntityId
      );
    }
    if (transfer.type === WarehouseTransferTypeEnum.INTER_BRAND) {
      return (
        (user.roles?.includes('MANAGER') || user.roles?.includes('ADMIN')) &&
        user.scope === ScopeEnum.GLOBAL
      );
    }
    return false;
  }

  private async generateFolio(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO transfer_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = transfer_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `TRF-${year}-${String(seq).padStart(4, '0')}`;
  }

  async findAll(
    user: UserPayload,
    filters: FilterWarehouseTransfersDto,
  ): Promise<{
    data: WarehouseTransfer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.transferRepo
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .leftJoinAndSelect('wt.originBranch', 'ob')
      .leftJoinAndSelect('wt.destinationBranch', 'db')
      .where('wt.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.originBranchId) {
      qb.andWhere('wt.origin_branch_id = :originBranchId', {
        originBranchId: filters.originBranchId,
      });
    }
    if (filters.destinationBranchId) {
      qb.andWhere('wt.destination_branch_id = :destinationBranchId', {
        destinationBranchId: filters.destinationBranchId,
      });
    }
    if (filters.status) {
      qb.andWhere('wt.status = :status', { status: filters.status });
    }

    const [data, total] = await qb
      .orderBy('wt.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<WarehouseTransfer> {
    const transfer = await this.transferRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: [
        'items',
        'items.part',
        'originBranch',
        'destinationBranch',
        'approver',
      ],
    });
    if (!transfer) {
      throw new NotFoundException(`Transferencia ${id} no encontrada`);
    }
    await this.assertInScope(user, transfer);
    return transfer;
  }

  async create(
    user: UserPayload,
    dto: CreateWarehouseTransferDto,
  ): Promise<WarehouseTransfer> {
    this.assertCanWrite(user);

    if (dto.originBranchId === dto.destinationBranchId) {
      throw new BadRequestException(
        'Origen y destino deben ser sucursales diferentes',
      );
    }

    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una línea');
    }

    const [originBranch, destBranch] = await Promise.all([
      this.branchRepo.findOne({
        where: { id: dto.originBranchId, tenantId: user.tenantId },
      }),
      this.branchRepo.findOne({
        where: { id: dto.destinationBranchId, tenantId: user.tenantId },
      }),
    ]);
    if (!originBranch || !destBranch) {
      throw new NotFoundException('Sucursal origen o destino no encontrada');
    }

    const partIds = [...new Set(dto.lines.map((l) => l.partId))];
    const parts = await this.partRepo.find({
      where: {
        id: In(partIds),
        branchId: dto.originBranchId,
        tenantId: user.tenantId,
      },
    });
    const foundPartIds = new Set(parts.map((p) => p.id));
    const missing = partIds.filter((id) => !foundPartIds.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Parte(s) no encontrada(s) en sucursal origen: ${missing.join(', ')}`,
      );
    }

    for (const line of dto.lines) {
      const part = parts.find((p) => p.id === line.partId)!;
      if (part.stockQuantity < line.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${part.name}: disponible ${part.stockQuantity}, solicitado ${line.quantity}`,
        );
      }
    }

    return this.dataSource
      .transaction(async (em) => {
        const folio = await this.generateFolio(user.tenantId, em);

        const transfer = em.create(WarehouseTransfer, {
          tenantId: user.tenantId,
          originBranchId: dto.originBranchId,
          destinationBranchId: dto.destinationBranchId,
          folio,
          type: dto.type,
          status: WarehouseTransferStatusEnum.PENDING,
          notes: dto.notes ?? null,
        });
        const saved = await em.save(transfer);

        for (const line of dto.lines) {
          const item = em.create(WarehouseTransferItem, {
            warehouseTransferId: saved.id,
            partId: line.partId,
            quantity: line.quantity,
          });
          await em.save(item);
        }

        return saved.id;
      })
      .then((id) => this.findOne(user, id));
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateWarehouseTransferDto,
  ): Promise<WarehouseTransfer> {
    this.assertCanWrite(user);

    const transfer = await this.findOne(user, id);
    if (transfer.status !== WarehouseTransferStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo se puede editar una transferencia en estado PENDING',
      );
    }

    if (dto.lines !== undefined) {
      if (!dto.lines.length) {
        throw new BadRequestException('Debe incluir al menos una línea');
      }

      const partIds = [...new Set(dto.lines.map((l) => l.partId))];
      const parts = await this.partRepo.find({
        where: {
          id: In(partIds),
          branchId: transfer.originBranchId,
          tenantId: user.tenantId,
        },
      });
      const foundPartIds = new Set(parts.map((p) => p.id));
      const missing = partIds.filter((id) => !foundPartIds.has(id));
      if (missing.length) {
        throw new NotFoundException(
          `Parte(s) no encontrada(s) en sucursal origen: ${missing.join(', ')}`,
        );
      }

      for (const line of dto.lines) {
        const part = parts.find((p) => p.id === line.partId)!;
        if (part.stockQuantity < line.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${part.name}: disponible ${part.stockQuantity}, solicitado ${line.quantity}`,
          );
        }
      }

      await this.itemRepo.delete({ warehouseTransferId: id });
      for (const line of dto.lines) {
        const item = this.itemRepo.create({
          warehouseTransferId: id,
          partId: line.partId,
          quantity: line.quantity,
        });
        await this.itemRepo.save(item);
      }
    }

    if (dto.notes !== undefined) {
      transfer.notes = dto.notes;
      await this.transferRepo.save(transfer);
    }

    return this.findOne(user, id);
  }

  async approve(user: UserPayload, id: string): Promise<WarehouseTransfer> {
    const transfer = await this.findOne(user, id);
    if (transfer.status !== WarehouseTransferStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo se puede aprobar una transferencia en estado PENDING',
      );
    }

    const canApprove = this.canApprove(user, transfer);
    if (!canApprove) {
      throw new ForbiddenException(
        transfer.type === WarehouseTransferTypeEnum.INTRA_BRAND
          ? 'INTRA_BRAND requiere aprobación de MANAGER con scope LEGAL_ENTITY'
          : 'INTER_BRAND requiere aprobación de MANAGER/ADMIN con scope GLOBAL',
      );
    }

    transfer.status = WarehouseTransferStatusEnum.APPROVED;
    transfer.approverId = user.sub;
    await this.transferRepo.save(transfer);
    return this.findOne(user, id);
  }

  async send(user: UserPayload, id: string): Promise<WarehouseTransfer> {
    this.assertCanWrite(user);

    const transfer = await this.findOne(user, id);
    if (transfer.status !== WarehouseTransferStatusEnum.APPROVED) {
      throw new BadRequestException(
        'Solo se puede enviar una transferencia en estado APPROVED',
      );
    }

    const itemCount = await this.itemRepo.count({
      where: { warehouseTransferId: id },
    });
    if (itemCount === 0) {
      throw new BadRequestException(
        'La transferencia debe tener al menos una línea',
      );
    }

    return this.dataSource
      .transaction(async (em) => {
        const items = await em.find(WarehouseTransferItem, {
          where: { warehouseTransferId: id },
        });

        for (const item of items) {
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: item.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', {
              branchId: transfer.originBranchId,
            })
            .andWhere('p.deleted_at IS NULL')
            .getOne();

          if (!part) {
            throw new NotFoundException(
              `Parte ${item.partId} no encontrada en sucursal origen`,
            );
          }

          const stockBefore = part.stockQuantity;
          const stockAfter = stockBefore - item.quantity;

          if (stockAfter < 0) {
            throw new BadRequestException(
              `Stock insuficiente para parte ${part.name}: disponible ${stockBefore}, solicitado ${item.quantity}`,
            );
          }

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: item.partId,
            branchId: transfer.originBranchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.TRANSFER_OUT,
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            referenceId: transfer.id,
            referenceType: 'warehouse_transfer',
            notes: null,
          });
          await em.save(movement);

          part.stockQuantity = stockAfter;
          await em.save(part);
        }

        await em.update(WarehouseTransfer, id, {
          status: WarehouseTransferStatusEnum.IN_TRANSIT,
        });
      })
      .then(() => this.findOne(user, id));
  }

  async receive(user: UserPayload, id: string): Promise<WarehouseTransfer> {
    this.assertCanWrite(user);

    const transfer = await this.findOne(user, id);
    if (transfer.status !== WarehouseTransferStatusEnum.IN_TRANSIT) {
      throw new BadRequestException(
        'Solo se puede recibir una transferencia en estado IN_TRANSIT',
      );
    }

    return this.dataSource
      .transaction(async (em) => {
        const items = await em.find(WarehouseTransferItem, {
          where: { warehouseTransferId: id },
          relations: ['part'],
        });

        for (const item of items) {
          const originPart = item.part;
          if (!originPart) {
            throw new NotFoundException(`Parte ${item.partId} no encontrada`);
          }

          const destPart = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.sku = :sku', { sku: originPart.sku })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', {
              branchId: transfer.destinationBranchId,
            })
            .andWhere('p.deleted_at IS NULL')
            .getOne();

          let partId: string;
          let stockBefore: number;
          let stockAfter: number;

          if (destPart) {
            partId = destPart.id;
            stockBefore = destPart.stockQuantity;
            stockAfter = stockBefore + item.quantity;
            destPart.stockQuantity = stockAfter;
            await em.save(destPart);
          } else {
            const newPart = em.create(Part, {
              tenantId: user.tenantId,
              branchId: transfer.destinationBranchId,
              categoryId: originPart.categoryId,
              locationId: null,
              sku: originPart.sku,
              barcode: originPart.barcode,
              name: originPart.name,
              description: originPart.description,
              vehicleType: originPart.vehicleType,
              compatibleMakes: originPart.compatibleMakes,
              unitOfMeasure: originPart.unitOfMeasure,
              purchasePrice: originPart.purchasePrice,
              publicPrice: originPart.publicPrice,
              wholesalePrice: originPart.wholesalePrice,
              businessPrice: originPart.businessPrice,
              maxDiscountPct: originPart.maxDiscountPct,
              stockQuantity: item.quantity,
              minStock: originPart.minStock,
              maxStock: originPart.maxStock,
              imageKey: originPart.imageKey,
              isActive: originPart.isActive,
            });
            const saved = await em.save(newPart);
            partId = saved.id;
            stockBefore = 0;
            stockAfter = item.quantity;
          }

          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId,
            branchId: transfer.destinationBranchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.TRANSFER_IN,
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            referenceId: transfer.id,
            referenceType: 'warehouse_transfer',
            notes: null,
          });
          await em.save(movement);
        }

        await em.update(WarehouseTransfer, id, {
          status: WarehouseTransferStatusEnum.RECEIVED,
        });
      })
      .then(() => this.findOne(user, id));
  }

  async cancel(user: UserPayload, id: string): Promise<WarehouseTransfer> {
    this.assertCanWrite(user);

    const transfer = await this.findOne(user, id);
    if (
      transfer.status !== WarehouseTransferStatusEnum.PENDING &&
      transfer.status !== WarehouseTransferStatusEnum.APPROVED
    ) {
      throw new BadRequestException(
        'Solo se puede cancelar una transferencia en estado PENDING o APPROVED',
      );
    }

    transfer.status = WarehouseTransferStatusEnum.CANCELLED;
    await this.transferRepo.save(transfer);
    return this.findOne(user, id);
  }
}
