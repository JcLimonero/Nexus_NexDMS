import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { FilterBrandsDto } from './dto/filter-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterBrandsDto,
  ): Promise<{
    data: Brand[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [data, total] = await this.brandRepo.findAndCount({
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

  async findOne(user: UserPayload, id: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!brand) {
      throw new NotFoundException(`Marca ${id} no encontrada`);
    }
    return brand;
  }

  async create(user: UserPayload, dto: CreateBrandDto): Promise<Brand> {
    const brand = this.brandRepo.create({
      name: dto.name,
      type: dto.type,
      logoKey: dto.logoKey ?? null,
      isActive: dto.isActive ?? true,
      tenantId: user.tenantId,
    });
    return this.brandRepo.save(brand);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateBrandDto,
  ): Promise<Brand> {
    const brand = await this.findOne(user, id);
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }

  async deactivate(user: UserPayload, id: string): Promise<Brand> {
    const brand = await this.findOne(user, id);
    brand.isActive = false;
    return this.brandRepo.save(brand);
  }
}
