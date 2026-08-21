import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { stringSimilarity } from 'string-similarity-js';
import { GlobalModel } from './entities/global-model.entity';
import { CreateGlobalModelDto } from './dto/create-global-model.dto';
import { UpdateGlobalModelDto } from './dto/update-global-model.dto';
import { FilterGlobalModelsDto } from './dto/filter-global-models.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { VehicleTypesService } from '../vehicle-types/vehicle-types.service';

const SIMILARITY_THRESHOLD = 0.85;

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

    const qb = this.modelRepo
      .createQueryBuilder('gm')
      .leftJoinAndSelect('gm.brand', 'brand')
      .leftJoinAndSelect('gm.vehicleType', 'vehicleType')
      .leftJoinAndSelect('gm.combustionType', 'combustionType');

    if (filters.vehicleTypeId) {
      qb.andWhere('gm.vehicle_type_id = :vehicleTypeId', {
        vehicleTypeId: filters.vehicleTypeId,
      });
    }
    if (filters.year !== undefined) {
      qb.andWhere('gm.year = :year', { year: filters.year });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('gm.is_active = :isActive', { isActive: filters.isActive });
    }
    if (filters.brandId) {
      qb.andWhere('gm.brand_id = :brandId', { brandId: filters.brandId });
    }
    if (filters.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      qb.andWhere(
        `(brand.name ILIKE :s
          OR gm.model ILIKE :s
          OR gm.version ILIKE :s)`,
        { s },
      );
    }

    const [data, total] = await qb
      .orderBy('brand.name', 'ASC')
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

  async findSimilarSuggestions(
    brandId: string,
    model: string,
    version?: string,
  ): Promise<{ similarModels: string[]; similarVersions: string[] }> {
    const modelTrim = model?.trim() || '';
    const versionTrim = version?.trim() || '';
    const similarModels: string[] = [];
    const similarVersions: string[] = [];

    if (modelTrim) {
      const rows = await this.modelRepo
        .createQueryBuilder('gm')
        .select('DISTINCT gm.model')
        .where('gm.brand_id = :brandId', { brandId })
        .andWhere('gm.is_active = true')
        .getRawMany<{ model: string }>();

      for (const r of rows) {
        if (r.model.toLowerCase() === modelTrim.toLowerCase()) continue;
        const sim = stringSimilarity(modelTrim, r.model);
        if (sim >= SIMILARITY_THRESHOLD) similarModels.push(r.model);
      }
    }

    if (versionTrim && modelTrim) {
      const rows = await this.modelRepo
        .createQueryBuilder('gm')
        .select('DISTINCT gm.version')
        .where('gm.brand_id = :brandId', { brandId })
        .andWhere('LOWER(TRIM(gm.model)) = LOWER(:model)', { model: modelTrim })
        .andWhere('gm.is_active = true')
        .getRawMany<{ version: string }>();

      for (const r of rows) {
        if (r.version.toLowerCase() === versionTrim.toLowerCase()) continue;
        const sim = stringSimilarity(versionTrim, r.version);
        if (sim >= SIMILARITY_THRESHOLD) similarVersions.push(r.version);
      }
    }

    return { similarModels, similarVersions };
  }

  async findOne(_user: UserPayload, id: string): Promise<GlobalModel> {
    const model = await this.modelRepo.findOne({
      where: { id },
      relations: ['brand', 'vehicleType', 'vehicleType.category', 'combustionType'],
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
    const modelName = dto.model.trim();
    const versionName = dto.version.trim();
    await this.assertNoSimilarModel(dto.brandId, modelName);
    await this.assertNoSimilarVersion(dto.brandId, modelName, versionName);
    await this.assertUniqueBrandModelVersionYear(
      dto.brandId,
      modelName,
      versionName,
      dto.year,
    );
    const model = this.modelRepo.create({
      ...dto,
      model: dto.model.trim(),
      version: dto.version.trim(),
      combustionTypeId: dto.combustionTypeId ?? null,
      displacement: dto.displacement ?? null,
      doorCount: dto.doorCount ?? null,
      passengerCount: dto.passengerCount ?? null,
      exteriorColorId: dto.exteriorColorId ?? null,
      interiorColorId: dto.interiorColorId ?? null,
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
    const brandId = dto.brandId ?? model.brandId;
    const modelName = dto.model !== undefined ? dto.model.trim() : model.model;
    const version =
      dto.version !== undefined ? dto.version.trim() : model.version;
    const year = dto.year ?? model.year;
    await this.assertNoSimilarModel(brandId, modelName, model.model);
    await this.assertNoSimilarVersion(
      brandId,
      modelName,
      version,
      model.version,
    );
    await this.assertUniqueBrandModelVersionYear(
      brandId,
      modelName,
      version,
      year,
      id,
    );
    Object.assign(model, {
      ...dto,
      model: dto.model !== undefined ? dto.model.trim() : model.model,
      version: dto.version !== undefined ? dto.version.trim() : model.version,
      exteriorColorId: dto.exteriorColorId !== undefined ? dto.exteriorColorId ?? null : model.exteriorColorId,
      interiorColorId: dto.interiorColorId !== undefined ? dto.interiorColorId ?? null : model.interiorColorId,
    });
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

  private async assertUniqueBrandModelVersionYear(
    brandId: string,
    model: string,
    version: string,
    year: number,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.modelRepo
      .createQueryBuilder('gm')
      .where('gm.brand_id = :brandId', { brandId })
      .andWhere('LOWER(TRIM(gm.model)) = LOWER(:model)', { model })
      .andWhere('LOWER(TRIM(gm.version)) = LOWER(:version)', { version })
      .andWhere('gm.year = :year', { year });
    if (excludeId) {
      qb.andWhere('gm.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        'Ya existe un modelo con la misma marca, modelo, versión y año',
      );
    }
  }

  private async assertNoSimilarModel(
    brandId: string,
    model: string,
    excludeModel?: string,
  ): Promise<void> {
    const rows = await this.modelRepo
      .createQueryBuilder('gm')
      .select('DISTINCT gm.model')
      .where('gm.brand_id = :brandId', { brandId })
      .andWhere('gm.is_active = true')
      .getRawMany<{ model: string }>();

    const existingModels = rows.map((r) => r.model);
    for (const existing of existingModels) {
      if (existing.toLowerCase() === model.toLowerCase()) continue;
      if (excludeModel && existing.toLowerCase() === excludeModel.toLowerCase())
        continue;
      const similarity = stringSimilarity(model, existing);
      if (similarity >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe un modelo muy similar: "${existing}". ¿Quisiste decir ese?`,
        );
      }
    }
  }

  private async assertNoSimilarVersion(
    brandId: string,
    model: string,
    version: string,
    excludeVersion?: string,
  ): Promise<void> {
    const qb = this.modelRepo
      .createQueryBuilder('gm')
      .select('DISTINCT gm.version')
      .where('gm.brand_id = :brandId', { brandId })
      .andWhere('LOWER(TRIM(gm.model)) = LOWER(:model)', { model })
      .andWhere('gm.is_active = true');
    const rows = await qb.getRawMany<{ version: string }>();

    for (const row of rows) {
      const existing = row.version;
      if (existing.toLowerCase() === version.toLowerCase()) continue;
      if (
        excludeVersion &&
        existing.toLowerCase() === excludeVersion.toLowerCase()
      )
        continue;
      const similarity = stringSimilarity(version, existing);
      if (similarity >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe una versión muy similar: "${existing}". ¿Quisiste decir esa?`,
        );
      }
    }
  }
}
