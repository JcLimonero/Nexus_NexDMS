import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CatalogUnit,
  CatalogUnitStatusEnum,
} from './entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { CreateCatalogUnitDto } from './dto/create-catalog-unit.dto';
import { UpdateCatalogUnitDto } from './dto/update-catalog-unit.dto';
import { FilterCatalogUnitsDto } from './dto/filter-catalog-units.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class CatalogUnitsService {
  constructor(
    @InjectRepository(CatalogUnit)
    private readonly unitRepo: Repository<CatalogUnit>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(UnitLocation)
    private readonly locationRepo: Repository<UnitLocation>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CatalogUnit>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.brandId) return;
        qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
          'b.brand_id = :brandId',
          { brandId: user.brandId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Solo WAREHOUSE, SELLER, MANAGER y ADMIN pueden gestionar catálogo de unidades',
      );
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterCatalogUnitsDto,
  ): Promise<{
    data: CatalogUnit[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    this.applyScope(qb, user);

    if (filters.vehicleType) {
      qb.andWhere('cu.vehicle_type = :vehicleType', {
        vehicleType: filters.vehicleType,
      });
    }
    if (filters.brand?.trim()) {
      qb.andWhere('cu.brand ILIKE :brand', {
        brand: `%${filters.brand.trim()}%`,
      });
    }
    if (filters.status) {
      qb.andWhere('cu.status = :status', { status: filters.status });
    }
    if (filters.branchId) {
      qb.andWhere('cu.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(cu.serial_number ILIKE :term OR cu.model ILIKE :term OR cu.brand ILIKE :term OR cu.color ILIKE :term)',
        { term },
      );
    }

    const [data, total] = await qb
      .orderBy('cu.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<CatalogUnit> {
    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.id = :id', { id })
      .andWhere('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    this.applyScope(qb, user);

    const unit = await qb.getOne();
    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }
    return unit;
  }

  async findBySerialNumber(
    user: UserPayload,
    serialNumber: string,
    branchId?: string,
  ): Promise<CatalogUnit> {
    if (!serialNumber?.trim()) {
      throw new BadRequestException('serialNumber es requerido');
    }
    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.serial_number = :serialNumber', {
        serialNumber: serialNumber.trim(),
      })
      .andWhere('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    this.applyScope(qb, user);
    if (branchId) {
      qb.andWhere('cu.branch_id = :branchId', { branchId });
    }

    const unit = await qb.getOne();
    if (!unit) {
      throw new NotFoundException(
        `Unidad con número de serie ${serialNumber} no encontrada`,
      );
    }
    return unit;
  }

  async create(
    user: UserPayload,
    dto: CreateCatalogUnitDto,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const existing = await this.unitRepo.findOne({
      where: { serialNumber: dto.serialNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe una unidad con número de serie ${dto.serialNumber}`,
      );
    }

    if (dto.locationId) {
      const location = await this.locationRepo.findOne({
        where: { id: dto.locationId, branchId: dto.branchId },
      });
      if (!location) {
        throw new NotFoundException(
          'Ubicación no encontrada o no pertenece a la sucursal',
        );
      }
    }

    const unit = this.unitRepo.create({
      ...dto,
      tenantId: user.tenantId,
      status: CatalogUnitStatusEnum.AVAILABLE,
      globalModelId: dto.globalModelId ?? null,
      engineNumber: dto.engineNumber ?? null,
      displacement: dto.displacement ?? null,
      doorCount: dto.doorCount ?? null,
      locationId: dto.locationId ?? null,
      imageKey: dto.imageKey ?? null,
      imagesKeys: null,
      notes: dto.notes ?? null,
      acquisitionDate: dto.acquisitionDate
        ? new Date(dto.acquisitionDate)
        : null,
    });
    return this.unitRepo.save(unit);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateCatalogUnitDto,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);
    const unit = await this.findOne(user, id);

    if (unit.status === CatalogUnitStatusEnum.SOLD) {
      throw new ForbiddenException('No se puede modificar una unidad vendida');
    }

    if (dto.serialNumber && dto.serialNumber !== unit.serialNumber) {
      const existing = await this.unitRepo.findOne({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe una unidad con número de serie ${dto.serialNumber}`,
        );
      }
    }

    if (dto.locationId) {
      const location = await this.locationRepo.findOne({
        where: { id: dto.locationId, branchId: unit.branchId },
      });
      if (!location) {
        throw new NotFoundException('Ubicación no encontrada');
      }
    }

    Object.assign(unit, dto);
    if (dto.acquisitionDate !== undefined) {
      unit.acquisitionDate = dto.acquisitionDate
        ? new Date(dto.acquisitionDate)
        : null;
    }
    return this.unitRepo.save(unit);
  }

  async updateLocation(
    user: UserPayload,
    id: string,
    locationId: string,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);
    const unit = await this.findOne(user, id);

    const location = await this.locationRepo.findOne({
      where: { id: locationId, branchId: unit.branchId },
    });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    unit.locationId = locationId;
    return this.unitRepo.save(unit);
  }
}
