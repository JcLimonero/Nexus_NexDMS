import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalEntity } from './entities/legal-entity.entity';
import { CreateLegalEntityDto } from './dto/create-legal-entity.dto';
import { FilterLegalEntitiesDto } from './dto/filter-legal-entities.dto';
import { UpdateLegalEntityDto } from './dto/update-legal-entity.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class LegalEntitiesService {
  constructor(
    @InjectRepository(LegalEntity)
    private readonly legalEntityRepo: Repository<LegalEntity>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterLegalEntitiesDto,
  ): Promise<{
    data: LegalEntity[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.legalEntityRepo
      .createQueryBuilder('le')
      .where('le.tenant_id = :tenantId', { tenantId: user.tenantId })
      .orderBy('le.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.isActive !== undefined) {
      qb.andWhere('le.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    const [data, total] = await qb.getManyAndCount();

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

  async findOne(user: UserPayload, id: string): Promise<LegalEntity> {
    const entity = await this.legalEntityRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!entity) {
      throw new NotFoundException(`Entidad legal ${id} no encontrada`);
    }
    return entity;
  }

  async create(
    user: UserPayload,
    dto: CreateLegalEntityDto,
  ): Promise<LegalEntity> {
    const entity = this.legalEntityRepo.create({
      name: dto.name,
      type: dto.type,
      logoKey: dto.logoKey ?? null,
      isActive: dto.isActive ?? true,
      tenantId: user.tenantId,
    });
    return this.legalEntityRepo.save(entity);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateLegalEntityDto,
  ): Promise<LegalEntity> {
    const entity = await this.findOne(user, id);
    Object.assign(entity, dto);
    return this.legalEntityRepo.save(entity);
  }

  async deactivate(user: UserPayload, id: string): Promise<LegalEntity> {
    const entity = await this.findOne(user, id);
    entity.isActive = false;
    return this.legalEntityRepo.save(entity);
  }
}
