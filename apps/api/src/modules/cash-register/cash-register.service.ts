import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSession } from './entities/cash-session.entity';
import { CashSessionStatusEnum } from './entities/cash-session.entity';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { FilterCashSessionsDto } from './dto/filter-cash-sessions.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepo: Repository<CashSession>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CashSession>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('cs.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = cs.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'CASHIER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER y ADMIN pueden abrir o cerrar caja',
      );
    }
  }

  async getActiveSession(
    user: UserPayload,
    branchId: string,
  ): Promise<CashSession> {
    const session = await this.sessionRepo.findOne({
      where: {
        tenantId: user.tenantId,
        branchId,
        status: CashSessionStatusEnum.OPEN,
      },
      relations: ['branch', 'user'],
    });
    if (!session) {
      throw new NotFoundException(
        'No hay sesión de caja abierta para esta sucursal',
      );
    }
    await this.assertBranchInScope(user, branchId);
    return session;
  }

  private async assertBranchInScope(
    user: UserPayload,
    branchId: string,
  ): Promise<void> {
    if (user.scope === ScopeEnum.BRANCH && user.branchId !== branchId) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    if (user.scope === ScopeEnum.BRAND && user.legalEntityId) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, tenantId: user.tenantId },
      });
      if (!branch || branch.legalEntityId !== user.legalEntityId) {
        throw new ForbiddenException('No tiene acceso a esta sucursal');
      }
    }
  }

  async open(user: UserPayload, dto: OpenCashSessionDto): Promise<CashSession> {
    this.assertCanWrite(user);
    await this.assertBranchInScope(user, dto.branchId);

    const existing = await this.sessionRepo.findOne({
      where: {
        tenantId: user.tenantId,
        branchId: dto.branchId,
        status: CashSessionStatusEnum.OPEN,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe una sesión de caja abierta para esta sucursal',
      );
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const session = this.sessionRepo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      userId: user.sub,
      openingBalance: dto.openingBalance,
      totalCash: 0,
      totalCard: 0,
      totalTransfer: 0,
      totalSales: 0,
      openedAt: new Date(),
      status: CashSessionStatusEnum.OPEN,
    });
    return this.sessionRepo.save(session);
  }

  async close(
    user: UserPayload,
    branchId: string,
    dto: CloseCashSessionDto,
  ): Promise<CashSession> {
    this.assertCanWrite(user);
    await this.assertBranchInScope(user, branchId);

    const session = await this.getActiveSession(user, branchId);

    const expectedBalance =
      Number(session.openingBalance) + Number(session.totalCash);
    const difference = Number(dto.closingBalance) - Number(expectedBalance);

    session.closingBalance = dto.closingBalance;
    session.closedAt = new Date();
    session.status = CashSessionStatusEnum.CLOSED;
    session.closingNotes = dto.closingNotes ?? null;
    session.difference = difference;

    await this.sessionRepo.save(session);
    return this.sessionRepo.findOneOrFail({
      where: { id: session.id },
      relations: ['branch', 'user'],
    });
  }

  async findAll(
    user: UserPayload,
    filters: FilterCashSessionsDto,
  ): Promise<{
    data: CashSession[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.sessionRepo
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.branch', 'branch')
      .leftJoinAndSelect('cs.user', 'user')
      .where('cs.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.branchId) {
      qb.andWhere('cs.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }

    const [data, total] = await qb
      .orderBy('cs.opened_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<CashSession> {
    const session = await this.sessionRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['branch', 'user'],
    });
    if (!session) {
      throw new NotFoundException(`Sesión de caja ${id} no encontrada`);
    }
    await this.assertBranchInScope(user, session.branchId);
    return session;
  }
}
