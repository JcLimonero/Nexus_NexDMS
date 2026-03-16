import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderStatusEnum } from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FilterServiceOrdersDto } from './dto/filter-service-orders.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AddPartDto } from './dto/add-part.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { DeliverServiceOrderDto } from './dto/deliver-service-order.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { CfdiService } from '../cfdi/cfdi.service';

const STATUS_TRANSITIONS: Record<
  ServiceOrderStatusEnum,
  Partial<Record<ServiceOrderStatusEnum, string[]>>
> = {
  [ServiceOrderStatusEnum.RECEIVED]: {
    [ServiceOrderStatusEnum.DIAGNOSIS]: ['reportedFault', 'kmIn', 'checklist'],
  },
  [ServiceOrderStatusEnum.DIAGNOSIS]: {
    [ServiceOrderStatusEnum.IN_PROGRESS]: [
      'mechanicId',
      'diagnosis',
      'promisedAt',
    ],
  },
  [ServiceOrderStatusEnum.IN_PROGRESS]: {
    [ServiceOrderStatusEnum.WAITING_PARTS]: [],
    [ServiceOrderStatusEnum.READY]: ['workPerformed', 'kmOut'],
  },
  [ServiceOrderStatusEnum.WAITING_PARTS]: {
    [ServiceOrderStatusEnum.IN_PROGRESS]: [],
  },
  [ServiceOrderStatusEnum.READY]: {
    [ServiceOrderStatusEnum.DELIVERED]: ['paymentMethod', 'laborCost'],
  },
  [ServiceOrderStatusEnum.DELIVERED]: {},
  [ServiceOrderStatusEnum.CANCELLED]: {},
};

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ReceptionChecklist)
    private readonly checklistRepo: Repository<ReceptionChecklist>,
    @InjectRepository(ServiceOrderPart)
    private readonly partRepo: Repository<ServiceOrderPart>,
    @InjectRepository(ServiceOrderTime)
    private readonly timeRepo: Repository<ServiceOrderTime>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Part)
    private readonly partEntityRepo: Repository<Part>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly cfdiService: CfdiService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<ServiceOrder>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('so.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.brandId) return;
        qb.innerJoin('branches', 'b', 'b.id = so.branch_id').andWhere(
          'b.brand_id = :brandId',
          { brandId: user.brandId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async generateFolio(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO service_order_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = service_order_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `OS-${year}-${String(seq).padStart(4, '0')}`;
  }

  async create(
    user: UserPayload,
    dto: CreateServiceOrderDto,
  ): Promise<ServiceOrder> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Solo CASHIER y ADMIN pueden crear órdenes de servicio',
      );
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    return this.dataSource
      .transaction(async (em) => {
        const folio = await this.generateFolio(user.tenantId, em);
        const receivedAt = new Date();
        const promisedAt = dto.promisedAt ? new Date(dto.promisedAt) : null;

        const so = em.create(ServiceOrder, {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          ownerId: dto.ownerId,
          vehicleId: dto.vehicleId,
          receptionContactId: dto.receptionContactId ?? null,
          receptionName: dto.receptionName ?? null,
          receptionPhone: dto.receptionPhone ?? null,
          userId: user.sub,
          mechanicId: dto.mechanicId ?? null,
          appointmentId: dto.appointmentId ?? null,
          quotationId: dto.quotationId ?? null,
          folio,
          status: ServiceOrderStatusEnum.RECEIVED,
          reportedFault: dto.reportedFault,
          diagnosis: null,
          workPerformed: null,
          kmIn: dto.kmIn,
          kmOut: null,
          laborCost: 0,
          partsCost: 0,
          discount: 0,
          total: 0,
          paymentMethod: null,
          cfdiUuid: null,
          receivedAt,
          promisedAt,
          readyAt: null,
          deliveredAt: null,
        });
        const saved = await em.save(so);
        return saved.id;
      })
      .then((id) => this.findOne(user, id));
  }

  async findAll(
    user: UserPayload,
    filters: FilterServiceOrdersDto,
  ): Promise<{
    data: ServiceOrder[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.soRepo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.owner', 'owner')
      .leftJoinAndSelect('so.vehicle', 'vehicle')
      .leftJoinAndSelect('so.mechanic', 'mechanic')
      .leftJoinAndSelect('so.branch', 'branch')
      .where('so.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (user.role === 'MECHANIC') {
      qb.andWhere('so.mechanic_id = :mechanicId', { mechanicId: user.sub });
    } else if (filters.mechanicId) {
      qb.andWhere('so.mechanic_id = :mechanicId', {
        mechanicId: filters.mechanicId,
      });
    }
    if (filters.clientId) {
      qb.andWhere('so.owner_id = :clientId', {
        clientId: filters.clientId,
      });
    }
    if (filters.status) {
      qb.andWhere('so.status = :status', { status: filters.status });
    }
    if (filters.branchId) {
      qb.andWhere('so.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('so.received_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('so.received_at <= :dateTo', {
        dateTo: `${filters.dateTo}T23:59:59.999Z`,
      });
    }

    const [data, total] = await qb
      .orderBy('so.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<ServiceOrder> {
    const so = await this.soRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: [
        'owner',
        'vehicle',
        'mechanic',
        'branch',
        'checklist',
        'parts',
        'parts.part',
        'timeEntries',
        'timeEntries.mechanic',
        'receptionContact',
        'appointment',
        'quotation',
      ],
    });
    if (!so) {
      throw new NotFoundException(`Orden de servicio ${id} no encontrada`);
    }
    const qb = this.soRepo
      .createQueryBuilder('so')
      .where('so.id = :id', { id })
      .andWhere('so.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Orden de servicio ${id} no encontrada`);
    }
    return so;
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateServiceOrderDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (
      so.status === ServiceOrderStatusEnum.DELIVERED ||
      so.status === ServiceOrderStatusEnum.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede editar una OS entregada o cancelada',
      );
    }
    await this.soRepo.update(id, dto as Partial<ServiceOrder>);
    return this.findOne(user, id);
  }

  async changeStatus(
    user: UserPayload,
    id: string,
    dto: ChangeStatusDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Sin permisos para cambiar estatus');
    }

    const transitions = STATUS_TRANSITIONS[so.status]?.[dto.status];
    if (transitions === undefined) {
      throw new BadRequestException(
        `Transición no permitida de ${so.status} a ${dto.status}`,
      );
    }

    const updateData: Partial<ServiceOrder> = { status: dto.status };
    if (dto.status === ServiceOrderStatusEnum.READY) {
      updateData.readyAt = new Date();
    }
    if (dto.status === ServiceOrderStatusEnum.DELIVERED) {
      throw new BadRequestException(
        'Use el endpoint POST /:id/deliver para entregar',
      );
    }

    await this.soRepo.update(id, updateData);
    return this.findOne(user, id);
  }

  async assignMechanic(
    user: UserPayload,
    id: string,
    mechanicId: string,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (
      so.status === ServiceOrderStatusEnum.DELIVERED ||
      so.status === ServiceOrderStatusEnum.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede asignar mecánico a una OS entregada o cancelada',
      );
    }
    await this.soRepo.update(id, { mechanicId });
    return this.findOne(user, id);
  }

  async addPart(
    user: UserPayload,
    id: string,
    dto: AddPartDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (
      so.status === ServiceOrderStatusEnum.DELIVERED ||
      so.status === ServiceOrderStatusEnum.CANCELLED
    ) {
      throw new BadRequestException(
        'No se pueden agregar partes a una OS entregada o cancelada',
      );
    }

    const part = await this.partEntityRepo.findOne({
      where: {
        id: dto.partId,
        branchId: so.branchId,
        tenantId: user.tenantId,
      },
    });
    if (!part) {
      throw new NotFoundException('Parte no encontrada');
    }
    if (part.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente: disponible ${part.stockQuantity}`,
      );
    }

    const unitPrice = Number(part.publicPrice);
    const subtotal = dto.quantity * unitPrice;

    return this.dataSource
      .transaction(async (em) => {
        const partEntity = await em
          .createQueryBuilder(Part, 'p')
          .setLock('pessimistic_write')
          .where('p.id = :partId', { partId: dto.partId })
          .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
          .andWhere('p.branch_id = :branchId', { branchId: so.branchId })
          .getOne();

        if (!partEntity) throw new NotFoundException('Parte no encontrada');
        const stockBefore = partEntity.stockQuantity;
        const stockAfter = stockBefore - dto.quantity;

        const sop = em.create(ServiceOrderPart, {
          serviceOrderId: id,
          partId: dto.partId,
          quantity: dto.quantity,
          unitPrice,
          subtotal,
        });
        await em.save(sop);

        const movement = em.create(StockMovement, {
          tenantId: user.tenantId,
          partId: dto.partId,
          branchId: so.branchId,
          userId: user.sub,
          movementType: StockMovementTypeEnum.SERVICE_OUT,
          quantity: dto.quantity,
          stockBefore,
          stockAfter,
          referenceId: id,
          referenceType: 'service_order',
          notes: null,
        });
        await em.save(movement);

        partEntity.stockQuantity = stockAfter;
        await em.save(partEntity);

        const parts = await em.find(ServiceOrderPart, {
          where: { serviceOrderId: id },
        });
        const partsCost = parts.reduce((s, p) => s + Number(p.subtotal), 0);
        const laborCost = Number(so.laborCost) || 0;
        const discount = Number(so.discount) || 0;
        const total = partsCost + laborCost - discount;

        await em.update(ServiceOrder, id, {
          partsCost,
          total,
        });
      })
      .then(() => this.findOne(user, id));
  }

  async removePart(
    user: UserPayload,
    id: string,
    osPartId: string,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (so.status === ServiceOrderStatusEnum.READY) {
      throw new BadRequestException(
        'No se pueden quitar partes cuando la OS está lista',
      );
    }
    if (
      so.status === ServiceOrderStatusEnum.DELIVERED ||
      so.status === ServiceOrderStatusEnum.CANCELLED
    ) {
      throw new BadRequestException(
        'No se pueden quitar partes de una OS entregada o cancelada',
      );
    }

    const sop = await this.partRepo.findOne({
      where: { id: osPartId, serviceOrderId: id },
    });
    if (!sop) {
      throw new NotFoundException('Parte no encontrada en la OS');
    }

    return this.dataSource
      .transaction(async (em) => {
        const partEntity = await em
          .createQueryBuilder(Part, 'p')
          .setLock('pessimistic_write')
          .where('p.id = :partId', { partId: sop.partId })
          .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
          .andWhere('p.branch_id = :branchId', { branchId: so.branchId })
          .getOne();

        if (!partEntity) throw new NotFoundException('Parte no encontrada');
        const stockBefore = partEntity.stockQuantity;
        const stockAfter = stockBefore + sop.quantity;

        await em.delete(ServiceOrderPart, { id: osPartId });

        const movement = em.create(StockMovement, {
          tenantId: user.tenantId,
          partId: sop.partId,
          branchId: so.branchId,
          userId: user.sub,
          movementType: StockMovementTypeEnum.ADJUSTMENT_IN,
          quantity: sop.quantity,
          stockBefore,
          stockAfter,
          referenceId: id,
          referenceType: 'service_order',
          notes: `Cancelación parte OS ${so.folio}`,
        });
        await em.save(movement);

        partEntity.stockQuantity = stockAfter;
        await em.save(partEntity);

        const parts = await em.find(ServiceOrderPart, {
          where: { serviceOrderId: id },
        });
        const partsCost = parts.reduce((s, p) => s + Number(p.subtotal), 0);
        const laborCost = Number(so.laborCost) || 0;
        const discount = Number(so.discount) || 0;
        const total = partsCost + laborCost - discount;

        await em.update(ServiceOrder, id, {
          partsCost,
          total,
        });
      })
      .then(() => this.findOne(user, id));
  }

  async createChecklist(
    user: UserPayload,
    id: string,
    dto: CreateChecklistDto,
  ): Promise<ReceptionChecklist> {
    await this.findOne(user, id);
    const existing = await this.checklistRepo.findOne({
      where: { serviceOrderId: id },
    });
    if (existing) {
      throw new BadRequestException('Ya existe checklist para esta OS');
    }
    const checklist = this.checklistRepo.create({
      serviceOrderId: id,
      userId: user.sub,
      fuelLevel: dto.fuelLevel,
      kmIn: dto.kmIn,
      hasSpareTire: dto.hasSpareTire,
      hasTools: dto.hasTools,
      hasDocuments: dto.hasDocuments,
      hasMats: dto.hasMats,
      observations: dto.observations ?? null,
      damageDescription: dto.damageDescription ?? null,
    });
    return this.checklistRepo.save(checklist);
  }

  async startTime(user: UserPayload, id: string): Promise<ServiceOrderTime> {
    await this.findOne(user, id);
    const allowed = ['SUPERADMIN', 'ADMIN', 'MECHANIC'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Solo MECANICO puede registrar tiempo');
    }
    const active = await this.timeRepo.findOne({
      where: {
        serviceOrderId: id,
        mechanicId: user.sub,
        endedAt: IsNull(),
      },
    });
    if (active) {
      throw new BadRequestException('Ya hay un registro de tiempo activo');
    }
    const entry = this.timeRepo.create({
      serviceOrderId: id,
      mechanicId: user.sub,
      startedAt: new Date(),
      endedAt: null,
      minutes: 0,
    });
    return this.timeRepo.save(entry);
  }

  async pauseTime(user: UserPayload, id: string): Promise<ServiceOrderTime> {
    await this.findOne(user, id);
    const entry = await this.timeRepo.findOne({
      where: {
        serviceOrderId: id,
        mechanicId: user.sub,
        endedAt: IsNull(),
      },
    });
    if (!entry) {
      throw new BadRequestException('No hay registro de tiempo activo');
    }
    const endedAt = new Date();
    const minutes = Math.round(
      (endedAt.getTime() - new Date(entry.startedAt).getTime()) / 60000,
    );
    await this.timeRepo.update(entry.id, { endedAt, minutes });
    return this.timeRepo.findOneOrFail({ where: { id: entry.id } });
  }

  async getTimeSummary(user: UserPayload, id: string) {
    await this.findOne(user, id);
    const entries = await this.timeRepo.find({
      where: { serviceOrderId: id },
      relations: ['mechanic'],
    });
    const byMechanic = entries.reduce(
      (acc, e) => {
        const key = e.mechanicId;
        if (!acc[key])
          acc[key] = { mechanicId: key, totalMinutes: 0, entries: [] };
        acc[key].totalMinutes += e.minutes;
        acc[key].entries.push(e);
        return acc;
      },
      {} as Record<
        string,
        {
          mechanicId: string;
          totalMinutes: number;
          entries: ServiceOrderTime[];
        }
      >,
    );
    return Object.values(byMechanic);
  }

  async deliver(
    user: UserPayload,
    id: string,
    dto: DeliverServiceOrderDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (so.status !== ServiceOrderStatusEnum.READY) {
      throw new BadRequestException(
        'Solo órdenes en estado LISTO pueden entregarse',
      );
    }
    const laborCost = Number(so.laborCost) || 0;
    if (laborCost < 0) {
      throw new BadRequestException('Debe registrar costo de mano de obra');
    }
    await this.soRepo.update(id, {
      status: ServiceOrderStatusEnum.DELIVERED,
      paymentMethod: dto.paymentMethod,
      cfdiUuid: dto.cfdiUuid ?? null,
      deliveredAt: new Date(),
    });
    try {
      await this.cfdiService.generarIngreso('ServiceOrder', id);
    } catch (e) {
      this.logger.warn('CFDI no generado', e);
    }
    return this.findOne(user, id);
  }

  async cancel(user: UserPayload, id: string): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (so.status === ServiceOrderStatusEnum.DELIVERED) {
      throw new BadRequestException('No se puede cancelar una OS ya entregada');
    }
    if (so.status === ServiceOrderStatusEnum.CANCELLED) {
      throw new BadRequestException('La OS ya está cancelada');
    }

    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Sin permisos para cancelar');
    }

    return this.dataSource
      .transaction(async (em) => {
        const parts = await em.find(ServiceOrderPart, {
          where: { serviceOrderId: id },
        });
        for (const sop of parts) {
          const part = await em
            .createQueryBuilder(Part, 'p')
            .setLock('pessimistic_write')
            .where('p.id = :partId', { partId: sop.partId })
            .andWhere('p.tenant_id = :tenantId', { tenantId: user.tenantId })
            .andWhere('p.branch_id = :branchId', { branchId: so.branchId })
            .getOne();
          if (!part) continue;
          const stockBefore = part.stockQuantity;
          const stockAfter = stockBefore + sop.quantity;
          const movement = em.create(StockMovement, {
            tenantId: user.tenantId,
            partId: sop.partId,
            branchId: so.branchId,
            userId: user.sub,
            movementType: StockMovementTypeEnum.ADJUSTMENT_IN,
            quantity: sop.quantity,
            stockBefore,
            stockAfter,
            referenceId: id,
            referenceType: 'service_order',
            notes: `Cancelación OS ${so.folio}`,
          });
          await em.save(movement);
          part.stockQuantity = stockAfter;
          await em.save(part);
        }
        await em.update(ServiceOrder, id, {
          status: ServiceOrderStatusEnum.CANCELLED,
        });
      })
      .then(() => this.findOne(user, id));
  }
}
