import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleModel } from '../vehicle-models/entities/vehicle-model.entity';
import { stringSimilarity } from 'string-similarity-js';
import { VehicleVersion } from './entities/vehicle-version.entity';
import { CreateVehicleVersionDto } from './dto/create-vehicle-version.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

const SIMILARITY_THRESHOLD = 0.85;

@Injectable()
export class VehicleVersionsService {
  constructor(
    @InjectRepository(VehicleVersion)
    private readonly repo: Repository<VehicleVersion>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
  ) {}

  async findByContext(
    brandId: string,
    modelName: string,
    year: number,
    versionName: string,
  ): Promise<VehicleVersion | null> {
    if (!brandId || !modelName?.trim() || !versionName?.trim()) return null;
    const model = await this.modelRepo
      .createQueryBuilder('m')
      .where('m.brand_id = :brandId', { brandId })
      .andWhere('LOWER(m.name) = LOWER(:name)', { name: modelName.trim() })
      .getOne();
    if (!model) return null;
    return this.repo
      .createQueryBuilder('v')
      .where('v.brand_id = :brandId', { brandId })
      .andWhere('v.model_id = :modelId', { modelId: model.id })
      .andWhere('v.year = :year', { year })
      .andWhere('LOWER(v.name) = LOWER(:name)', { name: versionName.trim() })
      .getOne();
  }

  async findByBrandModelYear(
    brandId: string,
    modelId: string,
    year: number,
  ): Promise<VehicleVersion[]> {
    return this.repo.find({
      where: { brandId, modelId, year },
      order: { name: 'ASC' },
    });
  }

  async findOne(_user: UserPayload, id: string): Promise<VehicleVersion> {
    const version = await this.repo.findOne({ where: { id } });
    if (!version) {
      throw new NotFoundException(`Versión ${id} no encontrada`);
    }
    return version;
  }

  async create(
    user: UserPayload,
    dto: CreateVehicleVersionDto,
  ): Promise<VehicleVersion> {
    this.assertCanModify(user);
    const name = dto.name.trim();
    const existing = await this.repo
      .createQueryBuilder('v')
      .where('v.brand_id = :brandId', { brandId: dto.brandId })
      .andWhere('v.model_id = :modelId', { modelId: dto.modelId })
      .andWhere('v.year = :year', { year: dto.year })
      .andWhere('LOWER(v.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      throw new ConflictException(
        `Ya existe la versión "${name}" para este modelo y año`,
      );
    }
    await this.assertNoSimilarVersion(
      dto.brandId,
      dto.modelId,
      dto.year,
      name,
    );
    const version = this.repo.create({
      brandId: dto.brandId,
      modelId: dto.modelId,
      year: dto.year,
      name,
    });
    return this.repo.save(version);
  }

  private assertCanModify(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Se requiere rol autorizado para modificar catálogos de vehículos',
      );
    }
  }

  private async assertNoSimilarVersion(
    brandId: string,
    modelId: string,
    year: number,
    name: string,
  ): Promise<void> {
    const versions = await this.repo.find({
      where: { brandId, modelId, year },
    });
    for (const v of versions) {
      if (v.name.toLowerCase() === name.toLowerCase()) continue;
      const sim = stringSimilarity(name, v.name);
      if (sim >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe una versión muy similar: "${v.name}". ¿Quisiste decir esa?`,
        );
      }
    }
  }
}
