import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

    const where: Record<string, unknown> = {};
    if (filters.vehicleTypeId) where.vehicleTypeId = filters.vehicleTypeId;
    if (filters.year !== undefined) where.year = filters.year;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.brandName?.trim()) {
      where.brandName = ILike(`%${filters.brandName.trim()}%`);
    }

    const [data, total] = await this.modelRepo.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      relations: ['vehicleType', 'combustionType'],
      order: { brandName: 'ASC', model: 'ASC' },
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
      relations: ['vehicleType', 'combustionType'],
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
    this.assertSuperadmin(user);
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
    this.assertSuperadmin(user);
    const model = await this.findOne(user, id);
    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  private assertSuperadmin(user: UserPayload) {
    if (!user.roles?.includes('SUPERADMIN')) {
      throw new ForbiddenException(
        'Solo SUPERADMIN puede modificar el catálogo global',
      );
    }
  }
}
