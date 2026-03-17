import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalModel } from './entities/global-model.entity';
import { CreateGlobalModelDto } from './dto/create-global-model.dto';
import { UpdateGlobalModelDto } from './dto/update-global-model.dto';
import { FilterGlobalModelsDto } from './dto/filter-global-models.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { VehicleTypesService } from '../vehicle-types/vehicle-types.service';

@Injectable()
export class GlobalModelsService {
  constructor(
    @InjectRepository(GlobalModel)
    private readonly modelRepo: Repository<GlobalModel>,
    private readonly vehicleTypesService: VehicleTypesService,
  ) {}

  async getBrands(vehicleTypeCode: string): Promise<string[]> {
    const types = await this.vehicleTypesService.findAll();
    const type = types.find((t) => t.code === vehicleTypeCode);
    if (!type) return [];

    const rows = await this.modelRepo
      .createQueryBuilder('gm')
      .innerJoin('gm.brand', 'b')
      .select('DISTINCT b.name')
      .where('gm.vehicle_type_id = :vehicleTypeId', { vehicleTypeId: type.id })
      .andWhere('gm.is_active = true')
      .andWhere('b.is_active = true')
      .orderBy('b.name', 'ASC')
      .getRawMany<{ name: string }>();

    return rows.map((r) => r.name);
  }

  async getModels(vehicleTypeCode: string, brandName: string): Promise<string[]> {
    if (!brandName?.trim()) return [];

    const types = await this.vehicleTypesService.findAll();
    const type = types.find((t) => t.code === vehicleTypeCode);
    if (!type) return [];

    const rows = await this.modelRepo
      .createQueryBuilder('gm')
      .innerJoin('gm.brand', 'b')
      .select('DISTINCT gm.model')
      .where('gm.vehicle_type_id = :vehicleTypeId', { vehicleTypeId: type.id })
      .andWhere('b.name ILIKE :brandName', { brandName: brandName.trim() })
      .andWhere('gm.is_active = true')
      .orderBy('gm.model', 'ASC')
      .getRawMany<{ model: string }>();

    return rows.map((r) => r.model);
  }

  async findAll(
    _user: UserPayload,
    filters: FilterGlobalModelsDto,
  ): Promise<{
    data: GlobalModel[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const where: Record<string, unknown> = {};
    if (filters.vehicleTypeId) where.vehicleTypeId = filters.vehicleTypeId;
    if (filters.year !== undefined) where.year = filters.year;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.brandId) where.brandId = filters.brandId;

    const [data, total] = await this.modelRepo.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      relations: ['brand', 'vehicleType', 'combustionType'],
      order: { brand: { name: 'ASC' }, model: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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

  async findOne(_user: UserPayload, id: string): Promise<GlobalModel> {
    const model = await this.modelRepo.findOne({
      where: { id },
      relations: ['brand', 'vehicleType', 'combustionType'],
    });
    if (!model) {
      throw new NotFoundException(`Modelo ${id} no encontrado`);
    }
    return model;
  }

  async create(
    user: UserPayload,
    dto: CreateGlobalModelDto,
  ): Promise<GlobalModel> {
    this.assertCanModifyCatalog(user);
    const model = this.modelRepo.create({
      ...dto,
      version: dto.version ?? null,
      combustionTypeId: dto.combustionTypeId ?? null,
      displacement: dto.displacement ?? null,
      doorCount: dto.doorCount ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.modelRepo.save(model);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateGlobalModelDto,
  ): Promise<GlobalModel> {
    this.assertCanModifyCatalog(user);
    const model = await this.findOne(user, id);
    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  private assertCanModifyCatalog(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    const hasRole = allowed.some((r) => user.roles?.includes(r));
    if (!hasRole) {
      throw new ForbiddenException(
        'Se requiere rol SUPERADMIN, ADMIN o MANAGER para modificar el catálogo global',
      );
    }
  }
}
