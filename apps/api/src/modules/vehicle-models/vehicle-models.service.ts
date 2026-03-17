import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { stringSimilarity } from 'string-similarity-js';
import { VehicleModel } from './entities/vehicle-model.entity';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

const SIMILARITY_THRESHOLD = 0.85;

@Injectable()
export class VehicleModelsService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly repo: Repository<VehicleModel>,
  ) {}

  async findByBrandId(brandId: string): Promise<VehicleModel[]> {
    return this.repo.find({
      where: { brandId },
      order: { name: 'ASC' },
    });
  }

  async findOne(_user: UserPayload, id: string): Promise<VehicleModel> {
    const model = await this.repo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Modelo ${id} no encontrado`);
    }
    return model;
  }

  async create(
    user: UserPayload,
    dto: CreateVehicleModelDto,
  ): Promise<VehicleModel> {
    this.assertCanModify(user);
    const name = dto.name.trim();
    const existing = await this.repo
      .createQueryBuilder('m')
      .where('m.brand_id = :brandId', { brandId: dto.brandId })
      .andWhere('LOWER(m.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      throw new ConflictException(
        `Ya existe el modelo "${name}" para esta marca`,
      );
    }
    await this.assertNoSimilarModel(dto.brandId, name);
    const model = this.repo.create({ brandId: dto.brandId, name });
    return this.repo.save(model);
  }

  private assertCanModify(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Se requiere rol autorizado para modificar catálogos de vehículos',
      );
    }
  }

  private async assertNoSimilarModel(
    brandId: string,
    name: string,
  ): Promise<void> {
    const models = await this.repo.find({ where: { brandId } });
    for (const m of models) {
      if (m.name.toLowerCase() === name.toLowerCase()) continue;
      const sim = stringSimilarity(name, m.name);
      if (sim >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe un modelo muy similar: "${m.name}". ¿Quisiste decir ese?`,
        );
      }
    }
  }
}
