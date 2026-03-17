import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Warranty } from './entities/warranty.entity';
import { WarrantyStatusEnum } from './entities/warranty.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { FilterWarrantiesDto } from './dto/filter-warranties.dto';
import { AuthorizeWarrantyDto } from './dto/authorize-warranty.dto';
import { ResolveWarrantyDto } from './dto/resolve-warranty.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class WarrantiesService {
  constructor(
    @InjectRepository(Warranty)
    private readonly warrantyRepo: Repository<Warranty>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Warranty>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('w.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = w.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async create(user: UserPayload, dto: CreateWarrantyDto): Promise<Warranty> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER y ADMIN pueden crear garantías',
      );
    }

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    if (!dto.unitSaleId && !dto.serviceOrderId) {
      throw new BadRequestException('Debe indicar unitSaleId o serviceOrderId');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException(
        'fechaFin debe ser posterior a fechaInicio',
      );
    }

    const warranty = this.warrantyRepo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      unitSaleId: dto.unitSaleId ?? null,
      serviceOrderId: dto.serviceOrderId ?? null,
      clientId: dto.clientId,
      vehicleId: dto.vehicleId,
      authorizerId: null,
      type: dto.type,
      description: dto.description,
      status: WarrantyStatusEnum.OPEN,
      resolution: null,
      newServiceOrderId: null,
      startDate,
      endDate,
    });
    return this.warrantyRepo.save(warranty);
  }

  async findAll(
    user: UserPayload,
    filters: FilterWarrantiesDto,
  ): Promise<{
    data: Warranty[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.warrantyRepo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.client', 'client')
      .leftJoinAndSelect('w.vehicle', 'vehicle')
      .leftJoinAndSelect('w.branch', 'branch')
      .leftJoinAndSelect('w.authorizer', 'authorizer')
      .where('w.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.clientId) {
      qb.andWhere('w.client_id = :clientId', {
        clientId: filters.clientId,
      });
    }
    if (filters.status) {
      qb.andWhere('w.status = :status', { status: filters.status });
    }
    if (filters.type) {
      qb.andWhere('w.type = :type', { type: filters.type });
    }
    if (filters.branchId) {
      qb.andWhere('w.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }

    const [data, total] = await qb
      .orderBy('w.createdAt', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<Warranty> {
    const warranty = await this.warrantyRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: [
        'client',
        'vehicle',
        'branch',
        'authorizer',
        'unitSale',
        'serviceOrder',
        'newServiceOrder',
      ],
    });
    if (!warranty) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }
    const qb = this.warrantyRepo
      .createQueryBuilder('w')
      .where('w.id = :id', { id })
      .andWhere('w.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }
    return warranty;
  }

  async authorize(
    user: UserPayload,
    id: string,
    dto: AuthorizeWarrantyDto,
  ): Promise<Warranty> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo GERENTE o ADMIN pueden autorizar garantías',
      );
    }
    const warranty = await this.findOne(user, id);
    if (warranty.status !== WarrantyStatusEnum.OPEN) {
      throw new BadRequestException(
        'Solo garantías abiertas pueden ser autorizadas',
      );
    }
    await this.warrantyRepo.update(id, {
      status: WarrantyStatusEnum.IN_PROGRESS,
      authorizerId: user.sub,
    });
    if (dto.createServiceOrder) {
      // TODO: crear OS sin costo desde la garantía
    }
    return this.findOne(user, id);
  }

  async resolve(
    user: UserPayload,
    id: string,
    dto: ResolveWarrantyDto,
  ): Promise<Warranty> {
    const warranty = await this.findOne(user, id);
    const allowedStatuses = [
      WarrantyStatusEnum.OPEN,
      WarrantyStatusEnum.IN_PROGRESS,
    ];
    if (!allowedStatuses.includes(warranty.status)) {
      throw new BadRequestException(
        'No se puede resolver una garantía ya resuelta o rechazada',
      );
    }
    await this.warrantyRepo.update(id, {
      status: WarrantyStatusEnum.RESOLVED,
      resolution: dto.resolution,
    });
    return this.findOne(user, id);
  }

  async reject(
    user: UserPayload,
    id: string,
    _reason?: string,
  ): Promise<Warranty> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo GERENTE o ADMIN pueden rechazar garantías',
      );
    }
    const warranty = await this.findOne(user, id);
    if (warranty.status !== WarrantyStatusEnum.OPEN) {
      throw new BadRequestException(
        'Solo garantías abiertas pueden ser rechazadas',
      );
    }
    await this.warrantyRepo.update(id, {
      status: WarrantyStatusEnum.REJECTED,
      authorizerId: user.sub,
    });
    return this.findOne(user, id);
  }
}
