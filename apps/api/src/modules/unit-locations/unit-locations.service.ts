import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitLocation } from './entities/unit-location.entity';
import { CreateUnitLocationDto } from './dto/create-unit-location.dto';
import { UpdateUnitLocationDto } from './dto/update-unit-location.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class UnitLocationsService {
  constructor(
    @InjectRepository(UnitLocation)
    private readonly locationRepo: Repository<UnitLocation>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<UnitLocation>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('ul.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin(Branch, 'b', 'b.id = ul.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo WAREHOUSE, MANAGER y ADMIN pueden gestionar ubicaciones de unidades',
      );
    }
  }

  async findAll(user: UserPayload, branchId?: string): Promise<UnitLocation[]> {
    const qb = this.locationRepo
      .createQueryBuilder('ul')
      .where('ul.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (branchId) {
      qb.andWhere('ul.branch_id = :branchId', { branchId });
    }

    return qb
      .andWhere('ul.is_active = true')
      .orderBy('ul.zone', 'ASC')
      .addOrderBy('ul.space', 'ASC')
      .getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<UnitLocation> {
    const location = await this.locationRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!location) {
      throw new NotFoundException(`Ubicación ${id} no encontrada`);
    }
    const qb = this.locationRepo
      .createQueryBuilder('ul')
      .where('ul.id = :id', { id })
      .andWhere('ul.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Ubicación ${id} no encontrada`);
    }
    return location;
  }

  async create(
    user: UserPayload,
    dto: CreateUnitLocationDto,
  ): Promise<UnitLocation> {
    this.assertCanWrite(user);

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    const existing = await this.locationRepo.findOne({
      where: { branchId: dto.branchId, code: dto.code },
    });
    if (existing) {
      throw new ForbiddenException(
        `Ya existe una ubicación con código ${dto.code} en esta sucursal`,
      );
    }

    const location = this.locationRepo.create({
      ...dto,
      tenantId: user.tenantId,
    });
    return this.locationRepo.save(location);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateUnitLocationDto,
  ): Promise<UnitLocation> {
    this.assertCanWrite(user);
    const location = await this.findOne(user, id);
    Object.assign(location, dto);
    return this.locationRepo.save(location);
  }
}
