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
import {
  CashMovement,
  CashMovementKindEnum,
} from './entities/cash-movement.entity';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionRepo: Repository<CashSession>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CashSession>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('cs.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
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
    if (user.scope === ScopeEnum.SUCURSAL && user.branchId !== branchId) {
      throw new ForbiddenException('No tiene acceso a esta sucursal');
    }
    if (user.scope === ScopeEnum.LEGAL_ENTITY && user.legalEntityId) {
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

    // El candado es por cajero, no por sucursal: dos personas pueden tener su
    // propia caja abierta en el mismo mostrador, pero nadie dos a la vez.
    const existing = await this.sessionRepo.findOne({
      where: {
        tenantId: user.tenantId,
        userId: user.sub,
        status: CashSessionStatusEnum.OPEN,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya tienes una caja abierta; ciérrala antes de abrir otra',
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

    // Efectivo esperado: fondo + ventas en efectivo + depósitos − retiros −
    // gastos. Los movimientos manuales cuentan igual que las ventas.
    const movimientos = await this.movementRepo.find({
      where: { cashSessionId: session.id },
    });
    const netoMovimientos = movimientos.reduce((a, m) => {
      const monto = Number(m.amount);
      return m.kind === CashMovementKindEnum.DEPOSIT ? a + monto : a - monto;
    }, 0);
    const expected =
      Number(session.openingBalance) +
      Number(session.totalCash) +
      netoMovimientos;

    // El contado sale del arqueo si vino; si no, del monto manual.
    const contado = dto.denominations
      ? this.sumaArqueo(dto.denominations)
      : (dto.closingBalance ?? 0);
    if (dto.denominations && dto.closingBalance === undefined) {
      // ok, se calcula del arqueo
    } else if (!dto.denominations && dto.closingBalance === undefined) {
      throw new BadRequestException(
        'Indica el efectivo contado o el arqueo por denominaciones',
      );
    }

    session.closingBalance = contado;
    session.countedCash = String(contado);
    session.expectedCash = String(expected);
    session.denominations = dto.denominations ?? null;
    session.closedAt = new Date();
    session.status = CashSessionStatusEnum.CLOSED;
    session.closingNotes = dto.closingNotes ?? null;
    session.difference = contado - expected;

    await this.sessionRepo.save(session);
    return this.sessionRepo.findOneOrFail({
      where: { id: session.id },
      relations: ['branch', 'user'],
    });
  }

  /** Suma del arqueo: cada denominación por su cantidad. */
  private sumaArqueo(den: Record<string, number>): number {
    return Object.entries(den).reduce(
      (a, [valor, piezas]) => a + Number(valor) * (Number(piezas) || 0),
      0,
    );
  }

  // ─── Movimientos manuales de efectivo ────────────

  /** Registra un depósito, retiro o gasto en la caja abierta del cajero. */
  async registrarMovimiento(
    user: UserPayload,
    branchId: string,
    dto: {
      kind: CashMovementKindEnum;
      amount: number;
      concept: string;
      reference?: string;
      serviceOrderId?: string;
    },
  ): Promise<CashMovement> {
    this.assertCanWrite(user);
    const session = await this.getActiveSession(user, branchId);
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
    if (!dto.concept?.trim()) {
      throw new BadRequestException('El movimiento necesita un concepto');
    }
    return this.movementRepo.save(
      this.movementRepo.create({
        tenantId: user.tenantId,
        cashSessionId: session.id,
        kind: dto.kind,
        amount: String(dto.amount),
        concept: dto.concept.trim(),
        reference: dto.reference ?? null,
        serviceOrderId: dto.serviceOrderId ?? null,
        createdBy: { id: user.sub } as never,
      }),
    );
  }

  /** Movimientos de una sesión. */
  async movimientos(user: UserPayload, sessionId: string) {
    const session = await this.findOne(user, sessionId);
    const movs = await this.movementRepo.find({
      where: { cashSessionId: session.id },
      order: { createdAt: 'ASC' },
    });
    return movs.map((m) => ({ ...m, amount: Number(m.amount) }));
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
      .orderBy('cs.openedAt', 'DESC')
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
