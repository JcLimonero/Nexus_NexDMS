import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { stringSimilarity } from 'string-similarity-js';
import {
  VehicleColor,
  VehicleColorType,
} from './entities/vehicle-color.entity';
import { CreateVehicleColorDto } from './dto/create-vehicle-color.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

const SIMILARITY_THRESHOLD = 0.85;

@Injectable()
export class VehicleColorsService {
  constructor(
    @InjectRepository(VehicleColor)
    private readonly repo: Repository<VehicleColor>,
  ) {}

  async findByVersion(
    versionId: string,
    colorType?: VehicleColorType,
  ): Promise<VehicleColor[]> {
    const where: Record<string, unknown> = { versionId };
    if (colorType) where.colorType = colorType;
    return this.repo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findDistinctExteriorNames(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('DISTINCT c.name')
      .where('c.color_type = :type', { type: 'EXTERIOR' })
      .orderBy('c.name', 'ASC')
      .getRawMany();
    return rows.map((r) => r.name).filter(Boolean);
  }

  async findOne(_user: UserPayload, id: string): Promise<VehicleColor> {
    const color = await this.repo.findOne({ where: { id } });
    if (!color) {
      throw new NotFoundException(`Color ${id} no encontrado`);
    }
    return color;
  }

  async create(
    user: UserPayload,
    dto: CreateVehicleColorDto,
  ): Promise<VehicleColor> {
    this.assertCanModify(user);
    const name = dto.name.trim();
    const existing = await this.repo
      .createQueryBuilder('c')
      .where('c.version_id = :versionId', { versionId: dto.versionId })
      .andWhere('c.color_type = :colorType', { colorType: dto.colorType })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      throw new ConflictException(
        `Ya existe el color "${name}" (${dto.colorType}) para esta versión`,
      );
    }
    await this.assertNoSimilarColor(
      dto.versionId,
      name,
      dto.colorType,
    );
    const color = this.repo.create({
      brandId: dto.brandId,
      modelId: dto.modelId,
      versionId: dto.versionId,
      name,
      colorType: dto.colorType,
    });
    return this.repo.save(color);
  }

  private assertCanModify(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Se requiere rol autorizado para modificar catálogos de vehículos',
      );
    }
  }

  private async assertNoSimilarColor(
    versionId: string,
    name: string,
    colorType: VehicleColorType,
  ): Promise<void> {
    const colors = await this.repo.find({
      where: { versionId, colorType },
    });
    for (const c of colors) {
      if (c.name.toLowerCase() === name.toLowerCase()) continue;
      const sim = stringSimilarity(name, c.name);
      if (sim >= SIMILARITY_THRESHOLD) {
        throw new ConflictException(
          `Ya existe un color muy similar: "${c.name}". ¿Quisiste decir ese?`,
        );
      }
    }
  }
}
