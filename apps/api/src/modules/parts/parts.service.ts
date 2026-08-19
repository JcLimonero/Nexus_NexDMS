import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { PartEquivalence } from './entities/part-equivalence.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { FilterPartsDto, SearchScopeType } from './dto/filter-parts.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { PartVehicleTypeEnum } from './entities/part.entity';
import { BranchesService } from '../branches/branches.service';
import { PartCategory } from '../part-categories/entities/part-category.entity';
import { StockLocation } from '../stock-locations/entities/stock-location.entity';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(PartCategory)
    private readonly partCategoryRepo: Repository<PartCategory>,
    @InjectRepository(StockLocation)
    private readonly stockLocationRepo: Repository<StockLocation>,
    @InjectRepository(PartEquivalence)
    private readonly equivalenceRepo: Repository<PartEquivalence>,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Part>['createQueryBuilder']>,
    user: UserPayload,
    searchScope?: SearchScopeType,
  ) {
    const useGroup = searchScope === 'group';
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        if (useGroup && user.legalEntityId) {
          qb.innerJoin('branches', 'b', 'b.id = p.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('p.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        if (useGroup) {
          qb.innerJoin('branches', 'b', 'b.id = p.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('p.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
      case ScopeEnum.GLOBAL:
        if (useGroup && user.legalEntityId) {
          qb.innerJoin('branches', 'b', 'b.id = p.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('p.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterPartsDto,
  ): Promise<{
    data: Part[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.deleted_at IS NULL');

    if (filters.branchId) {
      await this.branchesService.assertBranchInScope(user, filters.branchId);
      qb.andWhere('p.branch_id = :branchId', { branchId: filters.branchId });
    } else if (filters.searchScope === 'group') {
      this.applyScope(qb, user, 'group');
    } else {
      this.applyScope(qb, user, 'local');
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      // Además de nombre/SKU/código, empareja por número de parte equivalente.
      qb.andWhere(
        `(p.name ILIKE :term OR p.sku ILIKE :term OR p.barcode ILIKE :term
          OR EXISTS (
            SELECT 1 FROM part_equivalences pe
            WHERE pe.part_id = p.id AND pe.equivalent_sku ILIKE :term
          ))`,
        { term },
      );
    }
    if (filters.categoryId) {
      qb.andWhere('p.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.vehicleType) {
      qb.andWhere('(p.vehicle_type = :vehicleType OR p.vehicle_type = :both)', {
        vehicleType: filters.vehicleType,
        both: PartVehicleTypeEnum.BOTH,
      });
    }
    if (filters.onlyAlerts) {
      qb.andWhere('p.stock_quantity <= p.min_stock');
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('p.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    const [data, total] = await qb
      .orderBy('p.name', 'ASC')
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

  async findOne(user: UserPayload, id: string): Promise<Part> {
    const qb = this.partRepo
      .createQueryBuilder('p')
      .where('p.id = :id', { id })
      .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.deleted_at IS NULL');
    this.applyScope(qb, user);
    const part = await qb.getOne();
    if (!part) {
      throw new NotFoundException(`Parte ${id} no encontrada`);
    }
    return part;
  }

  private generateSku(vehicleType: PartVehicleTypeEnum): string {
    const prefix =
      vehicleType === PartVehicleTypeEnum.MOTORCYCLE
        ? 'M'
        : vehicleType === PartVehicleTypeEnum.CAR
          ? 'C'
          : 'B';
    return `${prefix}-${Date.now()}`;
  }

  async create(user: UserPayload, dto: CreatePartDto): Promise<Part> {
    await this.branchesService.assertBranchInScope(user, dto.branchId);

    if (dto.categoryId) {
      const cat = await this.partCategoryRepo.findOne({
        where: { id: dto.categoryId, tenantId: user.tenantId },
      });
      if (!cat) {
        throw new NotFoundException(
          `Categoría ${dto.categoryId} no encontrada`,
        );
      }
    }

    if (dto.locationId) {
      const loc = await this.stockLocationRepo.findOne({
        where: {
          id: dto.locationId,
          branchId: dto.branchId,
          tenantId: user.tenantId,
        },
      });
      if (!loc) {
        throw new NotFoundException(
          `Ubicación ${dto.locationId} no encontrada o no pertenece a la sucursal`,
        );
      }
    }

    const sku = dto.sku ?? this.generateSku(dto.vehicleType);
    const part = this.partRepo.create({
      ...dto,
      sku,
      tenantId: user.tenantId,
      unitOfMeasure: dto.unitOfMeasure ?? 'PIECE',
      maxDiscountPct: dto.maxDiscountPct ?? 10,
      minStock: dto.minStock ?? 1,
      stockQuantity: 0,
      isActive: dto.isActive ?? true,
    });
    return this.partRepo.save(part);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdatePartDto,
  ): Promise<Part> {
    const part = await this.findOne(user, id);
    const { stockQuantity, ...rest } = dto as UpdatePartDto & {
      stockQuantity?: number;
    };
    if (stockQuantity !== undefined) {
      throw new BadRequestException(
        'stock_quantity no se puede modificar directamente. Use ajustes.',
      );
    }
    Object.assign(part, rest);
    return this.partRepo.save(part);
  }

  async softDelete(user: UserPayload, id: string): Promise<void> {
    const part = await this.findOne(user, id);
    if (part.stockQuantity !== 0) {
      throw new BadRequestException(
        'Solo se puede eliminar una parte con stock en cero',
      );
    }
    await this.partRepo.softRemove(part);
  }

  async scan(user: UserPayload, code: string, branchId: string): Promise<Part> {
    if (!code?.trim()) {
      throw new BadRequestException('Código requerido');
    }
    if (!branchId?.trim()) {
      throw new BadRequestException('branchId requerido');
    }
    await this.branchesService.assertBranchInScope(user, branchId);
    const term = code.trim();
    const part = await this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.branch_id = :branchId', { branchId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('(p.sku = :term OR p.barcode = :term)', { term })
      .getOne();
    if (!part) {
      throw new NotFoundException(`Parte con código ${term} no encontrada`);
    }
    return part;
  }

  async getLowStockAlerts(user: UserPayload): Promise<Part[]> {
    const qb = this.partRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('p.deleted_at IS NULL')
      .andWhere('p.stock_quantity <= p.min_stock');
    this.applyScope(qb, user);
    return qb.orderBy('p.stock_quantity', 'ASC').getMany();
  }

  async updateLocation(
    user: UserPayload,
    id: string,
    locationId: string | null,
  ): Promise<Part> {
    const part = await this.findOne(user, id);

    if (locationId) {
      const loc = await this.stockLocationRepo.findOne({
        where: {
          id: locationId,
          branchId: part.branchId,
          tenantId: user.tenantId,
        },
      });
      if (!loc) {
        throw new NotFoundException(
          `Ubicación ${locationId} no encontrada o no pertenece a la sucursal de la parte`,
        );
      }
    }

    part.locationId = locationId ?? null;
    return this.partRepo.save(part);
  }

  // ─── Equivalencias (números de parte alternos) ──────────────

  async listEquivalences(
    user: UserPayload,
    partId: string,
  ): Promise<PartEquivalence[]> {
    await this.findOne(user, partId); // valida acceso a la parte
    return this.equivalenceRepo.find({
      where: { partId },
      order: { createdAt: 'ASC' },
    });
  }

  async addEquivalence(
    user: UserPayload,
    partId: string,
    dto: { equivalentSku: string; brand?: string | null; note?: string | null },
  ): Promise<PartEquivalence> {
    await this.findOne(user, partId);
    const sku = dto.equivalentSku.trim();
    if (!sku) {
      throw new NotFoundException('El número de parte equivalente es requerido');
    }
    const existing = await this.equivalenceRepo.findOne({
      where: { partId, equivalentSku: sku },
    });
    if (existing) {
      existing.brand = dto.brand ?? existing.brand;
      existing.note = dto.note ?? existing.note;
      return this.equivalenceRepo.save(existing);
    }
    const eq = this.equivalenceRepo.create({
      tenantId: user.tenantId,
      partId,
      equivalentSku: sku,
      brand: dto.brand ?? null,
      note: dto.note ?? null,
    });
    return this.equivalenceRepo.save(eq);
  }

  async removeEquivalence(
    user: UserPayload,
    partId: string,
    equivId: string,
  ): Promise<void> {
    await this.findOne(user, partId);
    const eq = await this.equivalenceRepo.findOne({
      where: { id: equivId, partId },
    });
    if (!eq) {
      throw new NotFoundException(`Equivalencia ${equivId} no encontrada`);
    }
    await this.equivalenceRepo.delete(equivId);
  }
}
