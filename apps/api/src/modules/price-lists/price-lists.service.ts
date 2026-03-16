import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from './entities/price-list.entity';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { FilterPriceListsDto } from './dto/filter-price-lists.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class PriceListsService {
  constructor(
    @InjectRepository(PriceList)
    private readonly repo: Repository<PriceList>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<PriceList>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('pl.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = pl.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async checkBranchAccess(
    user: UserPayload,
    branchId: string,
  ): Promise<void> {
    if (user.scope === ScopeEnum.SUCURSAL && user.branchId !== branchId) {
      throw new ForbiddenException(
        'No tienes acceso a crear listas de precios en esta sucursal',
      );
    }
    if (user.scope === ScopeEnum.LEGAL_ENTITY && user.legalEntityId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- getRawOne retorna any
      const branch = await this.repo.manager
        .createQueryBuilder()
        .select('b.id')
        .from('branches', 'b')
        .where('b.id = :branchId', { branchId })
        .andWhere('b.tenant_id = :tenantId', { tenantId: user.tenantId })
        .andWhere('b.legal_entity_id = :legalEntityId', {
          legalEntityId: user.legalEntityId,
        })
        .getRawOne();
      if (!branch) {
        throw new ForbiddenException(
          'No tienes acceso a crear listas de precios en esta sucursal',
        );
      }
    }
  }

  async findAll(
    user: UserPayload,
    filter?: FilterPriceListsDto,
  ): Promise<PriceList[]> {
    const qb = this.repo
      .createQueryBuilder('pl')
      .where('pl.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filter?.branchId) {
      qb.andWhere('pl.branch_id = :branchId', { branchId: filter.branchId });
    }
    if (filter?.isActive !== undefined) {
      qb.andWhere('pl.is_active = :isActive', { isActive: filter.isActive });
    }

    return qb.orderBy('pl.name', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<PriceList> {
    const qb = this.repo
      .createQueryBuilder('pl')
      .where('pl.id = :id', { id })
      .andWhere('pl.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    const list = await qb.getOne();
    if (!list) {
      throw new NotFoundException(`Lista de precios ${id} no encontrada`);
    }
    return list;
  }

  async create(user: UserPayload, dto: CreatePriceListDto): Promise<PriceList> {
    await this.checkBranchAccess(user, dto.branchId);

    const list = this.repo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      name: dto.name,
      type: dto.type,
      discountPct: dto.discountPct ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(list);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdatePriceListDto,
  ): Promise<PriceList> {
    const list = await this.findOne(user, id);

    if (dto.branchId && dto.branchId !== list.branchId) {
      await this.checkBranchAccess(user, dto.branchId);
    }

    Object.assign(list, dto);
    return this.repo.save(list);
  }

  async remove(user: UserPayload, id: string): Promise<void> {
    await this.findOne(user, id);
    await this.repo.delete(id);
  }
}
