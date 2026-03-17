import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombustionType } from './entities/combustion-type.entity';
import { CreateCombustionTypeDto } from './dto/create-combustion-type.dto';
import { UpdateCombustionTypeDto } from './dto/update-combustion-type.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class CombustionTypesService {
  constructor(
    @InjectRepository(CombustionType)
    private readonly repo: Repository<CombustionType>,
  ) {}

  async findAll(): Promise<CombustionType[]> {
    return this.repo.find({
      order: { label: 'ASC' },
    });
  }

  async findOne(_user: UserPayload, id: string): Promise<CombustionType> {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`Tipo de combustión ${id} no encontrado`);
    }
    return type;
  }

  async create(
    user: UserPayload,
    dto: CreateCombustionTypeDto,
  ): Promise<CombustionType> {
    this.assertSuperadmin(user);
    const code = dto.code.trim().toUpperCase();
    const existing = await this.repo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`El código "${code}" ya existe`);
    }
    const type = this.repo.create({
      code,
      label: dto.label.trim(),
    });
    return this.repo.save(type);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateCombustionTypeDto,
  ): Promise<CombustionType> {
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
        'Solo SUPERADMIN puede modificar tipos de combustión',
      );
    }
  }
}
