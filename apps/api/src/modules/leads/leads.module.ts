import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  Client,
  ClientTypeEnum,
} from '../clients/entities/client.entity';
import { ModulesModule } from '../modules/modules.module';
import { ModuleGuard, RequiresModule } from '../modules/modules.module';

// ─── Entidades ─────────────────────────────────────

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'OPPORTUNITY'
  | 'WON'
  | 'LOST';

/** Flujo del pipeline; un lead solo avanza/retrocede dentro de esta lista. */
export const LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'OPPORTUNITY',
  'WON',
  'LOST',
];

@Entity('leads')
@Index(['tenantId', 'status'])
export class Lead {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;
  @Column({ name: 'name', type: 'varchar', length: 200 }) name: string;
  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;
  @Column({ name: 'email', type: 'varchar', length: 300, nullable: true })
  email: string | null;
  @Column({ name: 'source', type: 'varchar', length: 30, default: 'OTRO' })
  source: string;
  @Column({ name: 'interest', type: 'text', nullable: true })
  interest: string | null;
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'NEW' })
  status: LeadStatus;
  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string | null;
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;
  @Column({ name: 'notes', type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'lead_id', type: 'uuid' }) leadId: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;
  @Column({ name: 'type', type: 'varchar', length: 20, default: 'NOTE' })
  type: string;
  @Column({ name: 'notes', type: 'text' }) notes: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

// ─── Servicio ──────────────────────────────────────

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  list(user: UserPayload, status?: string) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (status) where.status = status;
    return this.leadRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 300,
    });
  }

  async findOne(user: UserPayload, id: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead no encontrado');
    return lead;
  }

  create(
    user: UserPayload,
    dto: Partial<Lead> & { name: string },
  ): Promise<Lead> {
    return this.leadRepo.save(
      this.leadRepo.create({
        tenantId: user.tenantId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        source: dto.source ?? 'OTRO',
        interest: dto.interest ?? null,
        notes: dto.notes ?? null,
        assignedTo: dto.assignedTo ?? user.sub,
        status: 'NEW',
      }),
    );
  }

  async update(
    user: UserPayload,
    id: string,
    dto: Partial<Lead>,
  ): Promise<Lead> {
    const lead = await this.findOne(user, id);
    const { name, phone, email, source, interest, notes, assignedTo } = dto;
    Object.assign(lead, {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(source !== undefined && { source }),
      ...(interest !== undefined && { interest }),
      ...(notes !== undefined && { notes }),
      ...(assignedTo !== undefined && { assignedTo }),
    });
    return this.leadRepo.save(lead);
  }

  async changeStatus(
    user: UserPayload,
    id: string,
    status: LeadStatus,
  ): Promise<Lead> {
    if (!LEAD_STATUSES.includes(status)) {
      throw new BadRequestException(`Estatus inválido: ${status}`);
    }
    const lead = await this.findOne(user, id);
    lead.status = status;
    await this.activityRepo.save(
      this.activityRepo.create({
        leadId: id,
        userId: user.sub,
        type: 'STATUS',
        notes: `Estatus cambiado a ${status}`,
      }),
    );
    return this.leadRepo.save(lead);
  }

  async addActivity(
    user: UserPayload,
    id: string,
    dto: { type?: string; notes: string },
  ): Promise<LeadActivity> {
    await this.findOne(user, id);
    return this.activityRepo.save(
      this.activityRepo.create({
        leadId: id,
        userId: user.sub,
        type: dto.type ?? 'NOTE',
        notes: dto.notes,
      }),
    );
  }

  getActivities(id: string): Promise<LeadActivity[]> {
    return this.activityRepo.find({
      where: { leadId: id },
      order: { createdAt: 'DESC' },
    });
  }

  /** Convierte el lead en cliente (si no lo es ya) y lo marca WON. */
  async convertToClient(user: UserPayload, id: string): Promise<Lead> {
    const lead = await this.findOne(user, id);
    if (lead.clientId) {
      throw new BadRequestException('Este lead ya fue convertido');
    }
    const [firstName, ...rest] = lead.name.trim().split(/\s+/);
    const client = await this.clientRepo.save(
      this.clientRepo.create({
        tenantId: user.tenantId,
        clientType: ClientTypeEnum.INDIVIDUAL,
        isCompany: false,
        firstName: firstName ?? lead.name,
        lastName: rest.join(' ') || '—',
        phone: lead.phone ?? '',
        email: lead.email ?? null,
      } as never),
    );
    lead.clientId = (client as unknown as { id: string }).id;
    lead.status = 'WON';
    await this.activityRepo.save(
      this.activityRepo.create({
        leadId: id,
        userId: user.sub,
        type: 'CONVERSION',
        notes: 'Lead convertido a cliente',
      }),
    );
    return this.leadRepo.save(lead);
  }
}

// ─── Controller ────────────────────────────────────

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard, ModuleGuard)
@Controller('leads')
@RequiresModule('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  list(@CurrentUser() user: UserPayload, @Query('status') status?: string) {
    return this.leadsService.list(user, status);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: Partial<Lead> & { name: string },
  ) {
    return this.leadsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Lead>,
  ) {
    return this.leadsService.update(user, id, dto);
  }

  @Post(':id/status')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  changeStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: LeadStatus },
  ) {
    return this.leadsService.changeStatus(user, id, body.status);
  }

  @Post(':id/activities')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  addActivity(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { type?: string; notes: string },
  ) {
    return this.leadsService.addActivity(user, id, dto);
  }

  @Get(':id/activities')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  getActivities(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.getActivities(id);
  }

  @Post(':id/convert')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  convert(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.convertToClient(user, id);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadActivity, Client]),
    ModulesModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
