import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part } from './entities/part.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { FilterPartsDto } from './dto/filter-parts.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { PartVehicleTypeEnum } from './entities/part.entity';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Part>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('p.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.brandId) return;
        qb.innerJoin('branches', 'b', 'b.id = p.branch_id').andWhere(
          'b.brand_id = :brandId',
          { brandId: user.brandId },
        );
        break;
      case ScopeEnum.GLOBAL:
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

    this.applyScope(qb, user);

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(p.name ILIKE :term OR p.sku ILIKE :term OR p.barcode ILIKE :term)',
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
    if (filters.branchId) {
      qb.andWhere('p.branch_id = :branchId', {
        branchId: filters.branchId,
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
    locationId: string,
  ): Promise<Part> {
    const part = await this.findOne(user, id);
    part.locationId = locationId;
    return this.partRepo.save(part);
  }
}
