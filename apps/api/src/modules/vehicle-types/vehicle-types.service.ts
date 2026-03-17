import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from './entities/vehicle-type.entity';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class VehicleTypesService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly repo: Repository<VehicleType>,
  ) {}

  async findAll(): Promise<VehicleType[]> {
    return this.repo.find({
      relations: ['category'],
      order: { label: 'ASC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<VehicleType[]> {
    return this.repo.find({
      where: { categoryId },
      order: { label: 'ASC' },
    });
  }

  async findOne(_user: UserPayload, id: string): Promise<VehicleType> {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`Tipo de vehículo ${id} no encontrado`);
    }
    return type;
  }

  async create(
    user: UserPayload,
    dto: CreateVehicleTypeDto,
  ): Promise<VehicleType> {
    this.assertSuperadmin(user);
    const code = dto.code.trim().toUpperCase();
    const existing = await this.repo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`El código "${code}" ya existe`);
    }
    const type = this.repo.create({
      categoryId: dto.categoryId,
      code,
      label: dto.label.trim(),
    });
    return this.repo.save(type);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateVehicleTypeDto,
  ): Promise<VehicleType> {
    this.assertSuperadmin(user);
    const type = await this.findOne(user, id);
    // El código es inmutable (identificador) - solo se puede cambiar la etiqueta
    if (dto.label !== undefined) type.label = dto.label.trim();
    return this.repo.save(type);
  }

  async remove(user: UserPayload, id: string): Promise<void> {
    this.assertSuperadmin(user);
    const type = await this.findOne(user, id);
    await this.repo.remove(type);
  }

  private assertSuperadmin(user: UserPayload) {
    if (!user.roles?.includes('SUPERADMIN')) {
      throw new ForbiddenException(
        'Solo SUPERADMIN puede modificar tipos de vehículo',
      );
    }
  }
}
