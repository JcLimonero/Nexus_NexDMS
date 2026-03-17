import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { stringSimilarity } from 'string-similarity-js';
import { GlobalBrand } from './entities/global-brand.entity';

const SIMILARITY_THRESHOLD = 0.85;
import { CreateGlobalBrandDto } from './dto/create-global-brand.dto';
import { UpdateGlobalBrandDto } from './dto/update-global-brand.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class GlobalBrandsService {
  constructor(
    @InjectRepository(GlobalBrand)
    private readonly repo: Repository<GlobalBrand>,
  ) {}

  async findAll(): Promise<GlobalBrand[]> {
    return this.repo.find({
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<GlobalBrand[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(_user: UserPayload, id: string): Promise<GlobalBrand> {
    const brand = await this.repo.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Marca ${id} no encontrada`);
    }
    return brand;
  }

  async create(
    user: UserPayload,
    dto: CreateGlobalBrandDto,
  ): Promise<GlobalBrand> {
    this.assertSuperadmin(user);
    const trimmed = dto.name.trim();
    const existing = await this.repo
      .createQueryBuilder('b')
      .where('LOWER(b.name) = LOWER(:name)', { name: trimmed })
      .getOne();
    if (existing) {
      throw new ConflictException(`La marca "${trimmed}" ya existe`);
    }
    await this.assertNoSimilarBrand(trimmed);
    const brand = this.repo.create({
      name: trimmed,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(brand);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateGlobalBrandDto,
  ): Promise<GlobalBrand> {
    this.assertSuperadmin(user);
    const brand = await this.findOne(user, id);
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      const existing = await this.repo
        .createQueryBuilder('b')
        .where('LOWER(b.name) = LOWER(:name)', { name: trimmed })
        .andWhere('b.id != :id', { id })
        .getOne();
      if (existing) {
        throw new ConflictException(`La marca "${trimmed}" ya existe`);
      }
      await this.assertNoSimilarBrand(trimmed, id);
      brand.name = trimmed;
    }
    if (dto.isActive !== undefined) brand.isActive = dto.isActive;
    return this.repo.save(brand);
  }

  async remove(user: UserPayload, id: string): Promise<void> {
    this.assertSuperadmin(user);
    const brand = await this.findOne(user, id);
    await this.repo.remove(brand);
  }

  private assertSuperadmin(user: UserPayload) {
    if (!user.roles?.includes('SUPERADMIN')) {
      throw new ForbiddenException(
        'Solo SUPERADMIN puede modificar el catálogo de marcas',
      );
    }
  }

  private async assertNoSimilarBrand(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const brands = await this.repo.find();
    for (const b of brands) {
      if (b.id === excludeId) continue;
      if (b.name.toLowerCase() === name.toLowerCase()) continue;
      const sim = stringSimilarity(name, b.name);
      if (sim >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe una marca muy similar: "${b.name}". ¿Quisiste decir esa?`,
        );
      }
    }
  }
}
