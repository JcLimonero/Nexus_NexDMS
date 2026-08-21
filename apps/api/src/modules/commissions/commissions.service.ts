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
import { ScopeEnum, User } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';
import { ServiceOrderOperation } from '../service-orders/entities/service-order-operation.entity';
import {
  ChargeTypeEnum,
  OperationStatusEnum,
} from '../service-orders/entities/service-order-operation.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(CommissionPeriod)
    private readonly periodRepo: Repository<CommissionPeriod>,
    @InjectRepository(CommissionDetail)
    private readonly detailRepo: Repository<CommissionDetail>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ServiceOrderOperation)
    private readonly opRepo: Repository<ServiceOrderOperation>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CommissionPeriod>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('cp.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
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

    await this.branchesService.assertBranchInScope(user, dto.branchId);

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

  /**
   * Calcula la comisión de un mecánico en un rango de fechas, aplicando las
   * reglas: por operación fichada (status DONE) de sus órdenes entregadas en el
   * rango, la comisión es el override si se fijó, o el % del mecánico sobre la
   * mano de obra; se excluyen las operaciones marcadas sin comisión y las de
   * tipos de cargo exentos. Al total se suma el sueldo garantía del periodo.
   */
  async previewMecanico(
    user: UserPayload,
    mechanicId: string,
    from: string,
    to: string,
  ) {
    const mecanico = await this.userRepo.findOne({
      where: { id: mechanicId, tenantId: user.tenantId },
    });
    if (!mecanico) throw new NotFoundException('Mecánico no encontrado');

    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
    });
    const exentos = new Set(tenant?.commissionExemptChargeTypes ?? []);
    const pct = Number(mecanico.commissionPercent) || 0;

    // Operaciones DONE del mecánico cuya orden se entregó en el rango.
    const ops = await this.opRepo
      .createQueryBuilder('op')
      .innerJoin(ServiceOrder, 'so', 'so.id = op.service_order_id')
      .where('op.mechanic_id = :mid', { mid: mechanicId })
      .andWhere('op.status = :done', { done: OperationStatusEnum.DONE })
      .andWhere('so.tenant_id = :tid', { tid: user.tenantId })
      .andWhere('so.delivered_at IS NOT NULL')
      .andWhere('so.delivered_at::date BETWEEN :from AND :to', { from, to })
      .orderBy('so.delivered_at', 'ASC')
      .getMany();

    const detalle = ops.map((op) => {
      const labor = Number(op.laborPrice) || 0;
      let comision = 0;
      let motivo = '';
      if (op.noCommission) {
        motivo = 'Marcada sin comisión';
      } else if (exentos.has(op.chargeType)) {
        motivo = `Tipo exento (${op.chargeType})`;
      } else if (op.commissionOverride != null) {
        comision = Number(op.commissionOverride) || 0;
        motivo = 'Ganancia fija (override)';
      } else {
        comision = Math.round(labor * pct) / 100;
        motivo = `${pct}% de mano de obra`;
      }
      return {
        operationId: op.id,
        description: op.description,
        chargeType: op.chargeType,
        laborPrice: labor,
        comision,
        motivo,
      };
    });

    const comisionTotal = detalle.reduce((s, d) => s + d.comision, 0);
    const sueldoGarantia = Number(mecanico.guaranteedSalary) || 0;
    return {
      mecanico: {
        id: mecanico.id,
        nombre: `${mecanico.firstName} ${mecanico.lastName}`.trim(),
        periodo: mecanico.commissionPeriod,
        porcentaje: pct,
        sueldoGarantia,
      },
      desde: from,
      hasta: to,
      operaciones: detalle,
      comisionTotal: Math.round(comisionTotal * 100) / 100,
      sueldoGarantia,
      // Sueldo garantía + comisión (siempre se pagan ambos).
      total: Math.round((sueldoGarantia + comisionTotal) * 100) / 100,
    };
  }
}
