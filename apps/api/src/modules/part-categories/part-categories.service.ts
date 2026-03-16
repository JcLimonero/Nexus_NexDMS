import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartCategory } from './entities/part-category.entity';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { UpdatePartCategoryDto } from './dto/update-part-category.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PartCategoriesService {
  constructor(
    @InjectRepository(PartCategory)
    private readonly repo: Repository<PartCategory>,
  ) {}

  async findAll(user: UserPayload): Promise<PartCategory[]> {
    return this.repo.find({
      where: { tenantId: user.tenantId },
      order: { name: 'ASC' },
    });
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

  async create(user: UserPayload, dto: CreatePartCategoryDto): Promise<PartCategory> {
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
