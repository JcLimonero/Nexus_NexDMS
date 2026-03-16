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

@Injectable()
export class GlobalModelsService {
  constructor(
    @InjectRepository(GlobalModel)
    private readonly modelRepo: Repository<GlobalModel>,
  ) {}

  async findAll(
    _user: UserPayload,
    filters: FilterGlobalModelsDto,
  ): Promise<{
    data: GlobalModel[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const qb = this.modelRepo.createQueryBuilder('gm').where('1=1');

    if (filters.brandName?.trim()) {
      qb.andWhere('gm.brand_name ILIKE :brandName', {
        brandName: `%${filters.brandName.trim()}%`,
      });
    }
    if (filters.vehicleType) {
      qb.andWhere('gm.vehicle_type = :vehicleType', {
        vehicleType: filters.vehicleType,
      });
    }
    if (filters.year) {
      qb.andWhere(
        'gm.year_start <= :year AND (gm.year_end IS NULL OR gm.year_end >= :year)',
        { year: filters.year },
      );
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('gm.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    const [data, total] = await qb
      .orderBy('gm.brand_name', 'ASC')
      .addOrderBy('gm.model', 'ASC')
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

  async findOne(_user: UserPayload, id: string): Promise<GlobalModel> {
    const model = await this.modelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Modelo ${id} no encontrado`);
    }
    return model;
  }

  async create(
    user: UserPayload,
    dto: CreateGlobalModelDto,
  ): Promise<GlobalModel> {
    this.assertSuperadmin(user);
    const model = this.modelRepo.create({
      ...dto,
      yearEnd: dto.yearEnd ?? null,
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
    this.assertSuperadmin(user);
    const model = await this.findOne(user, id);
    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  private assertSuperadmin(user: UserPayload) {
    if (user.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Solo SUPERADMIN puede modificar el catálogo global',
      );
    }
  }
}
