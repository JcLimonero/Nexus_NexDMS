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
  PrimaryGeneratedColumn,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { FinanceModule } from '../finance/finance.module';
import { FinanceService } from '../finance/finance.service';

export type IntakeStatus =
  | 'DRAFT'
  | 'APPRAISED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'PURCHASED'
  | 'REJECTED';

/** Transiciones válidas del flujo de toma de seminuevos. */
const INTAKE_FLOW: Record<IntakeStatus, IntakeStatus[]> = {
  DRAFT: ['APPRAISED', 'REJECTED'],
  APPRAISED: ['OFFERED', 'REJECTED'],
  OFFERED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PURCHASED', 'REJECTED'],
  PURCHASED: [],
  REJECTED: [],
};

@Entity('used_unit_intakes')
@Index(['tenantId', 'status'])
export class UsedUnitIntake {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;
  @Column({ name: 'seller_name', type: 'varchar', length: 200 })
  sellerName: string;
  @Column({ name: 'seller_phone', type: 'varchar', length: 20, nullable: true })
  sellerPhone: string | null;
  @Column({ name: 'brand', type: 'varchar', length: 100 }) brand: string;
  @Column({ name: 'model', type: 'varchar', length: 100 }) model: string;
  @Column({ name: 'year', type: 'int', nullable: true }) year: number | null;
  @Column({ name: 'plate', type: 'varchar', length: 20, nullable: true })
  plate: string | null;
  @Column({ name: 'vin', type: 'varchar', length: 50, nullable: true })
  vin: string | null;
  @Column({ name: 'km', type: 'int', nullable: true }) km: number | null;
  @Column({ name: 'asking_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  askingPrice: string | null;
  @Column({ name: 'appraised_value', type: 'numeric', precision: 12, scale: 2, nullable: true })
  appraisedValue: string | null;
  @Column({ name: 'offered_value', type: 'numeric', precision: 12, scale: 2, nullable: true })
  offeredValue: string | null;
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'DRAFT' })
  status: IntakeStatus;
  @Column({ name: 'notes', type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'catalog_unit_id', type: 'uuid', nullable: true })
  catalogUnitId: string | null;
  @Column({ name: 'payable_id', type: 'uuid', nullable: true })
  payableId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Injectable()
export class UsedUnitsService {
  constructor(
    @InjectRepository(UsedUnitIntake)
    private readonly intakeRepo: Repository<UsedUnitIntake>,
    private readonly financeService: FinanceService,
  ) {}

  list(user: UserPayload, status?: string) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (status) where.status = status;
    return this.intakeRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(user: UserPayload, id: string): Promise<UsedUnitIntake> {
    const intake = await this.intakeRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!intake) throw new NotFoundException('Toma no encontrada');
    return intake;
  }

  create(user: UserPayload, dto: Partial<UsedUnitIntake>) {
    if (!dto.sellerName || !dto.brand || !dto.model) {
      throw new BadRequestException(
        'sellerName, brand y model son requeridos',
      );
    }
    return this.intakeRepo.save(
      this.intakeRepo.create({
        ...dto,
        id: undefined,
        tenantId: user.tenantId,
        status: 'DRAFT',
        catalogUnitId: null,
        payableId: null,
      }),
    );
  }

  async update(user: UserPayload, id: string, dto: Partial<UsedUnitIntake>) {
    const intake = await this.findOne(user, id);
    if (intake.status === 'PURCHASED') {
      throw new BadRequestException('Una toma comprada no se puede editar');
    }
    const editable = [
      'sellerName', 'sellerPhone', 'brand', 'model', 'year', 'plate', 'vin',
      'km', 'askingPrice', 'appraisedValue', 'offeredValue', 'notes', 'branchId',
    ] as const;
    for (const k of editable) {
      if (dto[k] !== undefined) {
        (intake as unknown as Record<string, unknown>)[k] = dto[k];
      }
    }
    return this.intakeRepo.save(intake);
  }

  async changeStatus(user: UserPayload, id: string, status: IntakeStatus) {
    const intake = await this.findOne(user, id);
    if (!INTAKE_FLOW[intake.status]?.includes(status)) {
      throw new BadRequestException(
        `Transición no permitida de ${intake.status} a ${status}`,
      );
    }
    if (status === 'APPRAISED' && !intake.appraisedValue) {
      throw new BadRequestException('Registra el valor de avalúo primero');
    }
    if (status === 'OFFERED' && !intake.offeredValue) {
      throw new BadRequestException('Registra el valor ofertado primero');
    }
    if (status === 'PURCHASED') {
      // La compra genera la cuenta por pagar al particular
      const payable = await this.financeService.create(user, 'payable', {
        branchId: intake.branchId ?? undefined,
        beneficiaryName: intake.sellerName,
        referenceType: 'UsedUnitIntake',
        referenceId: intake.id,
        concept: `Compra seminuevo ${intake.brand} ${intake.model}${intake.plate ? ` (${intake.plate})` : ''}`,
        total: Number(intake.offeredValue),
      });
      intake.payableId = (payable as unknown as { id: string }).id;
    }
    intake.status = status;
    return this.intakeRepo.save(intake);
  }
}

@ApiTags('Used Units')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('used-units')
export class UsedUnitsController {
  constructor(private readonly usedUnitsService: UsedUnitsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  list(@CurrentUser() user: UserPayload, @Query('status') status?: string) {
    return this.usedUnitsService.list(user, status);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: Partial<UsedUnitIntake>,
  ) {
    return this.usedUnitsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<UsedUnitIntake>,
  ) {
    return this.usedUnitsService.update(user, id, dto);
  }

  @Post(':id/status')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  changeStatus(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: IntakeStatus },
  ) {
    return this.usedUnitsService.changeStatus(user, id, body.status);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UsedUnitIntake]), FinanceModule],
  controllers: [UsedUnitsController],
  providers: [UsedUnitsService],
})
export class UsedUnitsModule {}
