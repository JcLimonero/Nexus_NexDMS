import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Repository,
} from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  UnitSale,
  UnitSaleStatusEnum,
} from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';

/**
 * Configuración PLD por tenant. Los umbrales de la LFPIORPI para venta de
 * vehículos (Art. 17 fracc. VIII): identificación ≥ 3,210 UMA y aviso al
 * SAT/UIF ≥ 6,420 UMA. El valor de la UMA cambia cada año (INEGI) — por
 * eso es configurable y cada operación guarda el valor usado.
 */
export interface PldConfig {
  umaValue: number;
  identificationUma: number;
  noticeUma: number;
}

const DEFAULT_PLD: PldConfig = {
  umaValue: 113.14,
  identificationUma: 3210,
  noticeUma: 6420,
};

@Entity('pld_operations')
@Index(['tenantId', 'operationDate'])
export class PldOperation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;
  @Column({ name: 'reference_type', type: 'varchar', length: 50, default: 'UnitSale' })
  referenceType: string;
  @Column({ name: 'reference_id', type: 'uuid' }) referenceId: string;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: string;
  @Column({ name: 'uma_value', type: 'numeric', precision: 10, scale: 4 })
  umaValue: string;
  @Column({ name: 'uma_amount', type: 'numeric', precision: 12, scale: 2 })
  umaAmount: string;
  @Column({ name: 'operation_date', type: 'date' }) operationDate: string;
  @Column({ name: 'requires_identification', type: 'boolean', default: false })
  requiresIdentification: boolean;
  @Column({ name: 'requires_notice', type: 'boolean', default: false })
  requiresNotice: boolean;
  /** Expediente de identificación del cliente: PENDING | COMPLETE */
  @Column({ name: 'file_status', type: 'varchar', length: 20, default: 'PENDING' })
  fileStatus: string;
  /** Aviso al SAT/UIF: NOT_REQUIRED | PENDING | REPORTED */
  @Column({ name: 'notice_status', type: 'varchar', length: 20, default: 'NOT_REQUIRED' })
  noticeStatus: string;
  @Column({ name: 'reported_at', type: 'timestamp', nullable: true })
  reportedAt: Date | null;
  @Column({ name: 'notes', type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}

@Injectable()
export class PldService {
  constructor(
    @InjectRepository(PldOperation)
    private readonly opRepo: Repository<PldOperation>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(UnitSale)
    private readonly unitSaleRepo: Repository<UnitSale>,
  ) {}

  async getConfig(tenantId: string): Promise<PldConfig> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const stored = (tenant?.pldConfig ?? null) as PldConfig | null;
    return { ...DEFAULT_PLD, ...(stored ?? {}) };
  }

  async setConfig(
    tenantId: string,
    cfg: Partial<PldConfig>,
  ): Promise<PldConfig> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (cfg.umaValue !== undefined && cfg.umaValue <= 0) {
      throw new BadRequestException('umaValue debe ser mayor a 0');
    }
    const merged = { ...DEFAULT_PLD, ...(tenant.pldConfig ?? {}), ...cfg };
    tenant.pldConfig = merged as unknown as Record<string, number>;
    await this.tenantRepo.save(tenant);
    return merged;
  }

  /**
   * Evalúa las ventas de unidades COMPLETED que aún no tienen registro PLD
   * y crea las operaciones que superan el umbral de identificación.
   * Idempotente: la unicidad por referencia evita duplicados.
   */
  async evaluate(user: UserPayload) {
    const cfg = await this.getConfig(user.tenantId);
    const sales = await this.unitSaleRepo
      .createQueryBuilder('us')
      .where('us.tenant_id = :t', { t: user.tenantId })
      .andWhere('us.status = :s', { s: UnitSaleStatusEnum.COMPLETED })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM pld_operations po
          WHERE po.reference_type = 'UnitSale' AND po.reference_id = us.id)`,
      )
      .getMany();

    let created = 0;
    let flagged = 0;
    for (const sale of sales) {
      const amount = Number(sale.finalPrice);
      const umaAmount = amount / cfg.umaValue;
      const requiresIdentification = umaAmount >= cfg.identificationUma;
      const requiresNotice = umaAmount >= cfg.noticeUma;
      // Solo se registran operaciones que alcanzan algún umbral
      if (!requiresIdentification) continue;
      await this.opRepo.save(
        this.opRepo.create({
          tenantId: user.tenantId,
          branchId: (sale as unknown as { branchId?: string }).branchId ?? null,
          clientId: sale.clientId,
          referenceType: 'UnitSale',
          referenceId: sale.id,
          amount: String(amount),
          umaValue: String(cfg.umaValue),
          umaAmount: umaAmount.toFixed(2),
          operationDate: new Date(sale.createdAt)
            .toISOString()
            .slice(0, 10),
          requiresIdentification,
          requiresNotice,
          fileStatus: 'PENDING',
          noticeStatus: requiresNotice ? 'PENDING' : 'NOT_REQUIRED',
        }),
      );
      created += 1;
      if (requiresNotice) flagged += 1;
    }
    return { evaluated: sales.length, created, requiresNotice: flagged };
  }

  list(user: UserPayload, month?: string) {
    const qb = this.opRepo
      .createQueryBuilder('op')
      .leftJoinAndSelect('op.client', 'client')
      .where('op.tenant_id = :t', { t: user.tenantId })
      .orderBy('op.operationDate', 'DESC')
      .take(300);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      qb.andWhere("to_char(op.operation_date, 'YYYY-MM') = :m", { m: month });
    }
    return qb.getMany();
  }

  async summary(user: UserPayload) {
    const cfg = await this.getConfig(user.tenantId);
    const ops = await this.opRepo.find({
      where: { tenantId: user.tenantId },
    });
    return {
      config: cfg,
      total: ops.length,
      expedientesPendientes: ops.filter((o) => o.fileStatus === 'PENDING')
        .length,
      avisosPendientes: ops.filter((o) => o.noticeStatus === 'PENDING').length,
      avisosPresentados: ops.filter((o) => o.noticeStatus === 'REPORTED')
        .length,
    };
  }

  async updateOperation(
    user: UserPayload,
    id: string,
    dto: { fileStatus?: string; notes?: string },
  ) {
    const op = await this.opRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!op) throw new NotFoundException('Operación no encontrada');
    if (dto.fileStatus && ['PENDING', 'COMPLETE'].includes(dto.fileStatus)) {
      op.fileStatus = dto.fileStatus;
    }
    if (dto.notes !== undefined) op.notes = dto.notes;
    return this.opRepo.save(op);
  }

  async markReported(user: UserPayload, id: string) {
    const op = await this.opRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!op) throw new NotFoundException('Operación no encontrada');
    if (op.noticeStatus !== 'PENDING') {
      throw new BadRequestException('La operación no tiene aviso pendiente');
    }
    if (op.fileStatus !== 'COMPLETE') {
      throw new BadRequestException(
        'Completa el expediente de identificación antes de presentar el aviso',
      );
    }
    op.noticeStatus = 'REPORTED';
    op.reportedAt = new Date();
    return this.opRepo.save(op);
  }

  /** Export plano para el aviso mensual (SPPLD del SAT). */
  async exportMonth(user: UserPayload, month: string) {
    const ops = await this.list(user, month);
    return ops
      .filter((o) => o.requiresNotice)
      .map((o) => ({
        fecha: o.operationDate,
        cliente: o.client
          ? o.client.companyName ||
            [o.client.firstName, o.client.lastName].filter(Boolean).join(' ')
          : '',
        rfc: (o.client as unknown as { rfc?: string })?.rfc ?? '',
        monto: Number(o.amount),
        montoUma: Number(o.umaAmount),
        expediente: o.fileStatus,
        aviso: o.noticeStatus,
        referencia: o.referenceId,
      }));
  }
}

@ApiTags('PLD')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('pld')
export class PldController {
  constructor(private readonly pldService: PldService) {}

  @Get('config')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  getConfig(@CurrentUser() user: UserPayload) {
    return this.pldService.getConfig(user.tenantId);
  }

  @Patch('config')
  @Roles('SUPERADMIN', 'ADMIN')
  setConfig(@CurrentUser() user: UserPayload, @Body() cfg: Partial<PldConfig>) {
    return this.pldService.setConfig(user.tenantId, cfg);
  }

  @Post('evaluate')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  evaluate(@CurrentUser() user: UserPayload) {
    return this.pldService.evaluate(user);
  }

  @Get('operations')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  list(@CurrentUser() user: UserPayload, @Query('month') month?: string) {
    return this.pldService.list(user, month);
  }

  @Get('summary')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  summary(@CurrentUser() user: UserPayload) {
    return this.pldService.summary(user);
  }

  @Patch('operations/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { fileStatus?: string; notes?: string },
  ) {
    return this.pldService.updateOperation(user, id, dto);
  }

  @Post('operations/:id/mark-reported')
  @Roles('SUPERADMIN', 'ADMIN')
  markReported(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pldService.markReported(user, id);
  }

  @Get('export')
  @Roles('SUPERADMIN', 'ADMIN')
  exportMonth(@CurrentUser() user: UserPayload, @Query('month') month: string) {
    if (!/^\d{4}-\d{2}$/.test(month ?? '')) {
      throw new BadRequestException('month requerido en formato YYYY-MM');
    }
    return this.pldService.exportMonth(user, month);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PldOperation, Tenant, UnitSale, Client])],
  controllers: [PldController],
  providers: [PldService],
})
export class PldModule {}
