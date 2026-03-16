import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLocation } from './entities/stock-location.entity';
import { CreateStockLocationDto } from './dto/create-stock-location.dto';
import { UpdateStockLocationDto } from './dto/update-stock-location.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class StockLocationsService {
  constructor(
    @InjectRepository(StockLocation)
    private readonly repo: Repository<StockLocation>,
  ) {}

  async findAll(
    user: UserPayload,
    branchId?: string,
  ): Promise<StockLocation[]> {
    const qb = this.repo
      .createQueryBuilder('sl')
      .where('sl.tenant_id = :tenantId', { tenantId: user.tenantId });

    if (branchId) {
      qb.andWhere('sl.branch_id = :branchId', { branchId });
    }

    return qb.orderBy('sl.code', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<StockLocation> {
    const loc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!loc) {
      throw new NotFoundException(`Ubicación ${id} no encontrada`);
    }
    return loc;
  }

  async create(
    user: UserPayload,
    dto: CreateStockLocationDto,
  ): Promise<StockLocation> {
    const code =
      dto.code ??
      `${dto.zone}-${dto.aisle ?? ''}-${dto.shelf ?? ''}-${dto.level ?? ''}`.replace(
        /--+/g,
        '-',
      );
    const loc = this.repo.create({
      ...dto,
      code: code || dto.zone,
      tenantId: user.tenantId,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(loc);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateStockLocationDto,
  ): Promise<StockLocation> {
    const loc = await this.findOne(user, id);
    Object.assign(loc, dto);
    return this.repo.save(loc);
  }
}
