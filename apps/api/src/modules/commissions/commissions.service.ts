import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionPeriod } from './entities/commission-period.entity';
import { CommissionPeriodStatusEnum } from './entities/commission-period.entity';
import { CommissionDetail } from './entities/commission-detail.entity';
import { CommissionDetailStatusEnum } from './entities/commission-detail.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CreateCommissionPeriodDto } from './dto/create-commission-period.dto';
import { CreateCommissionDetailDto } from './dto/create-commission-detail.dto';
import { FilterCommissionPeriodsDto } from './dto/filter-commissions.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(CommissionPeriod)
    private readonly periodRepo: Repository<CommissionPeriod>,
    @InjectRepository(CommissionDetail)
    private readonly detailRepo: Repository<CommissionDetail>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CommissionPeriod>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('cp.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = cp.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async createPeriod(
    user: UserPayload,
    dto: CreateCommissionPeriodDto,
  ): Promise<CommissionPeriod> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden crear períodos de comisión',
      );
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const periodDate = new Date(dto.periodDate);
    const existing = await this.periodRepo.findOne({
      where: {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        periodDate,
        type: dto.type,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un período para esta sucursal, fecha y tipo',
      );
    }

    const period = this.periodRepo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      periodDate,
      type: dto.type,
      status: CommissionPeriodStatusEnum.OPEN,
      approverId: null,
    });
    return this.periodRepo.save(period);
  }

  async createDetail(
    user: UserPayload,
    dto: CreateCommissionDetailDto,
  ): Promise<CommissionDetail> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden crear detalles de comisión',
      );
    }

    const period = await this.periodRepo.findOne({
      where: { id: dto.periodId, tenantId: user.tenantId },
    });
    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }
    if (period.status !== CommissionPeriodStatusEnum.OPEN) {
      throw new BadRequestException(
        'Solo se pueden agregar detalles a períodos abiertos',
      );
    }

    const validTypes = ['sale', 'service_order', 'unit_sale'];
    if (!validTypes.includes(dto.referenceType)) {
      throw new BadRequestException(
        'referenceType debe ser sale, service_order o unit_sale',
      );
    }

    const detail = this.detailRepo.create({
      periodId: dto.periodId,
      userId: dto.userId,
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      concept: dto.concept,
      baseAmount: dto.baseAmount,
      amount: dto.amount,
      status: CommissionDetailStatusEnum.PENDING,
    });
    return this.detailRepo.save(detail);
  }

  async findAllPeriods(
    user: UserPayload,
    filters: FilterCommissionPeriodsDto,
  ): Promise<{
    data: CommissionPeriod[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.periodRepo
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.branch', 'branch')
      .leftJoinAndSelect('cp.approver', 'approver')
      .where('cp.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.branchId) {
      qb.andWhere('cp.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.status) {
      qb.andWhere('cp.status = :status', { status: filters.status });
    }
    if (filters.type) {
      qb.andWhere('cp.type = :type', { type: filters.type });
    }

    const [data, total] = await qb
      .orderBy('cp.period_date', 'DESC')
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

  async findOnePeriod(
    user: UserPayload,
    id: string,
  ): Promise<CommissionPeriod> {
    const period = await this.periodRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['branch', 'approver', 'details', 'details.user'],
    });
    if (!period) {
      throw new NotFoundException(`Período ${id} no encontrado`);
    }
    const qb = this.periodRepo
      .createQueryBuilder('cp')
      .where('cp.id = :id', { id })
      .andWhere('cp.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Período ${id} no encontrado`);
    }
    return period;
  }

  async approvePeriod(
    user: UserPayload,
    id: string,
  ): Promise<CommissionPeriod> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden aprobar períodos',
      );
    }
    const period = await this.findOnePeriod(user, id);
    if (period.status !== CommissionPeriodStatusEnum.UNDER_REVIEW) {
      throw new BadRequestException(
        'Solo períodos en revisión pueden ser aprobados',
      );
    }
    await this.periodRepo.update(id, {
      status: CommissionPeriodStatusEnum.APPROVED,
      approverId: user.sub,
    });
    return this.findOnePeriod(user, id);
  }

  async markAsPaid(user: UserPayload, id: string): Promise<CommissionPeriod> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden marcar como pagado',
      );
    }
    const period = await this.findOnePeriod(user, id);
    if (period.status !== CommissionPeriodStatusEnum.APPROVED) {
      throw new BadRequestException(
        'Solo períodos aprobados pueden marcarse como pagados',
      );
    }
    await this.periodRepo.update(id, {
      status: CommissionPeriodStatusEnum.PAID,
    });
    return this.findOnePeriod(user, id);
  }

  async submitForReview(
    user: UserPayload,
    id: string,
  ): Promise<CommissionPeriod> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden enviar a revisión',
      );
    }
    const period = await this.findOnePeriod(user, id);
    if (period.status !== CommissionPeriodStatusEnum.OPEN) {
      throw new BadRequestException(
        'Solo períodos abiertos pueden enviarse a revisión',
      );
    }
    await this.periodRepo.update(id, {
      status: CommissionPeriodStatusEnum.UNDER_REVIEW,
    });
    return this.findOnePeriod(user, id);
  }
}
