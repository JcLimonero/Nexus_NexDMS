import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartCategory } from './entities/part-category.entity';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { FilterPartCategoriesDto } from './dto/filter-part-categories.dto';
import { UpdatePartCategoryDto } from './dto/update-part-category.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PartCategoriesService {
  constructor(
    @InjectRepository(PartCategory)
    private readonly repo: Repository<PartCategory>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterPartCategoriesDto,
  ): Promise<{
    data: PartCategory[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [data, total] = await this.repo.findAndCount({
      where: { tenantId: user.tenantId },
      order: { name: 'ASC' },
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

  async findOne(user: UserPayload, id: string): Promise<PartCategory> {
    const cat = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!cat) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }
    return cat;
  }

  async create(
    user: UserPayload,
    dto: CreatePartCategoryDto,
  ): Promise<PartCategory> {
    const cat = this.repo.create({
      ...dto,
      tenantId: user.tenantId,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(cat);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdatePartCategoryDto,
  ): Promise<PartCategory> {
    const cat = await this.findOne(user, id);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }
}
