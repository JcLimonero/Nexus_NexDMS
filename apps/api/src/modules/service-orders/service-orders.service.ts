import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { ServiceOrder } from './entities/service-order.entity';
import { ServiceOrderStatusEnum } from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ReceptionPhoto } from './entities/reception-photo.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { ServiceOrderUpdate } from './entities/service-order-update.entity';
import { ServiceOrderPromiseChange } from './entities/service-order-promise-change.entity';
import { UpdatePromisedDateDto } from './dto/update-promised-date.dto';
import { ServiceOrderFinding } from './entities/service-order-finding.entity';
import {
  FindingCriticalityEnum,
  FindingStatusEnum,
  ServiceOrderFindingMediaTypeEnum,
} from './entities/service-order-finding.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { StockMovementTypeEnum } from '../stock-movements/entities/stock-movement.entity';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { FilterServiceOrdersDto } from './dto/filter-service-orders.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AddPartDto } from './dto/add-part.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { CreateUpdateDto } from './dto/create-update.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdatePartNotesDto } from './dto/update-part-notes.dto';
import { DeliverServiceOrderDto } from './dto/deliver-service-order.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { CfdiService } from '../cfdi/cfdi.service';
import { FinanceService } from '../finance/finance.service';
import { SurveysService } from '../surveys/surveys.service';
import { SurveyAreaEnum } from '../surveys/entities/survey-config.entity';
import { BranchesService } from '../branches/branches.service';
import { StorageService } from '../../common/storage/storage.service';
import { Client } from '../clients/entities/client.entity';
import {
  OsEntregadaEvent,
  ServicioHallazgoCotizacionEvent,
} from '../../events/domain-events';
import { ServiceSurvey } from './entities/service-survey.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

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
    @InjectRepository(ReceptionPhoto)
    private readonly receptionPhotoRepo: Repository<ReceptionPhoto>,
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
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    @InjectRepository(CustomerVehicle)
    private readonly customerVehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(ServiceOrderUpdate)
    private readonly updateRepo: Repository<ServiceOrderUpdate>,
    @InjectRepository(ServiceOrderFinding)
    private readonly findingRepo: Repository<ServiceOrderFinding>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ServiceSurvey)
    private readonly surveyRepo: Repository<ServiceSurvey>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(ServiceOrderPromiseChange)
    private readonly promiseChangeRepo: Repository<ServiceOrderPromiseChange>,
    private readonly dataSource: DataSource,
    private readonly cfdiService: CfdiService,
    private readonly branchesService: BranchesService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly financeService: FinanceService,
    private readonly surveysService: SurveysService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<ServiceOrder>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('so.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = so.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
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
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER y ADMIN pueden crear órdenes de servicio',
      );
    }

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    let serviceTypeId = dto.serviceTypeId ?? null;
    if (dto.appointmentId && !serviceTypeId) {
      const appointment = await this.appointmentRepo.findOne({
        where: { id: dto.appointmentId, tenantId: user.tenantId },
      });
      if (appointment?.serviceTypeId) {
        serviceTypeId = appointment.serviceTypeId;
      }
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
          serviceTypeId,
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
        const vehicle = await em.findOne(CustomerVehicle, {
          where: { id: dto.vehicleId },
        });
        if (
          vehicle?.catalogUnitId &&
          (dto.nextServiceDate || dto.nextServiceMileage != null)
        ) {
          const update: Partial<CatalogUnit> = {};
          if (dto.nextServiceDate) {
            update.nextServiceDate = new Date(dto.nextServiceDate);
          }
          if (dto.nextServiceMileage != null) {
            update.nextServiceMileage = dto.nextServiceMileage;
          }
          if (Object.keys(update).length > 0) {
            await em.update(CatalogUnit, vehicle.catalogUnitId, update);
          }
        }
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

    if (user.roles?.includes('MECHANIC')) {
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
    if (filters.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      qb.andWhere(
        `(so.folio ILIKE :s
          OR owner.first_name ILIKE :s
          OR owner.last_name ILIKE :s
          OR owner.company_name ILIKE :s
          OR owner.phone ILIKE :s
          OR vehicle.plate ILIKE :s)`,
        { s },
      );
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
      .orderBy('so.createdAt', 'DESC')
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
        'checklist.photos',
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

  /**
   * Cambia la fecha prometida de entrega registrando la justificación en la
   * bitácora (de→a, motivo, quién, cuándo). El motivo es obligatorio.
   */
  async updatePromisedDate(
    user: UserPayload,
    id: string,
    dto: UpdatePromisedDateDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    if (
      so.status === ServiceOrderStatusEnum.DELIVERED ||
      so.status === ServiceOrderStatusEnum.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede cambiar la fecha de una OS entregada o cancelada',
      );
    }
    const nueva = dto.promisedAt ? new Date(dto.promisedAt) : null;
    const anterior = so.promisedAt ? new Date(so.promisedAt) : null;
    await this.dataSource.transaction(async (em) => {
      await em.update(ServiceOrder, id, { promisedAt: nueva });
      await em.save(
        em.create(ServiceOrderPromiseChange, {
          tenantId: user.tenantId,
          serviceOrderId: id,
          oldPromisedAt: anterior,
          newPromisedAt: nueva,
          reason: dto.reason.trim(),
          changedByUserId: user.sub,
        }),
      );
    });
    return this.findOne(user, id);
  }

  /** Bitácora de cambios de la fecha prometida, más reciente primero. */
  async historialFechaPromesa(user: UserPayload, id: string) {
    await this.findOne(user, id); // valida acceso/tenant
    const rows = await this.promiseChangeRepo.find({
      where: { serviceOrderId: id, tenantId: user.tenantId },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      oldPromisedAt: r.oldPromisedAt,
      newPromisedAt: r.newPromisedAt,
      reason: r.reason,
      changedBy: r.changedBy
        ? `${r.changedBy.firstName} ${r.changedBy.lastName}`.trim()
        : null,
      createdAt: r.createdAt,
    }));
  }

  async changeStatus(
    user: UserPayload,
    id: string,
    dto: ChangeStatusDto,
  ): Promise<ServiceOrder> {
    const so = await this.findOne(user, id);
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException('Sin permisos para cambiar estatus');
    }

    // Flujo configurable por tenant (service_flow); fallback al default
    const tenant = await this.tenantRepo.findOne({
      where: { id: so.tenantId },
    });
    const customFlow = tenant?.serviceFlow ?? null;
    const allowedTargets = customFlow
      ? (customFlow[so.status] ?? [])
      : Object.keys(STATUS_TRANSITIONS[so.status] ?? {});
    if (!allowedTargets.includes(dto.status)) {
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
        'No se puede asignar técnico a una OS entregada o cancelada',
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
          notes: dto.notes ?? null,
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

  async uploadReceptionPhoto(
    user: UserPayload,
    id: string,
    angle: string,
    file: Express.Multer.File,
  ): Promise<ReceptionPhoto> {
    await this.findOne(user, id);
    const checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId: id },
    });
    if (!checklist) {
      throw new NotFoundException('No existe checklist para esta OS');
    }
    const validAngles = [
      'FRONT',
      'REAR',
      'LEFT_SIDE',
      'RIGHT_SIDE',
      'INTERIOR',
      'DASHBOARD',
      'TRUNK',
      'ENGINE',
      'WHEELS',
      'OTHER',
    ];
    if (!validAngles.includes(angle)) {
      throw new BadRequestException(
        `Ángulo inválido. Use: ${validAngles.join(', ')}`,
      );
    }
    const buffer = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (!buffer) {
      throw new BadRequestException('No se pudo leer el archivo');
    }
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `Tamaño máximo: 10MB. Recibido: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
      );
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo inválido. Use: image/jpeg, image/png, image/webp',
      );
    }
    const ext =
      file.mimetype === 'image/webp'
        ? 'webp'
        : (file.mimetype.split('/')[1] ?? 'jpg');
    const key = `service-orders/${id}/reception/${angle}_${Date.now()}.${ext}`;
    await this.storageService.upload(buffer, key, file.mimetype);
    const photo = this.receptionPhotoRepo.create({
      receptionChecklistId: checklist.id,
      angle,
      storageKey: key,
      mimeType: file.mimetype,
    });
    return this.receptionPhotoRepo.save(photo);
  }

  async updatePartNotes(
    user: UserPayload,
    id: string,
    partId: string,
    dto: UpdatePartNotesDto,
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
    const part = await this.partRepo.findOne({
      where: { id: partId, serviceOrderId: id },
    });
    if (!part) {
      throw new NotFoundException('Parte no encontrada en la OS');
    }
    await this.partRepo.update(partId, { notes: dto.notes ?? null });
    return this.findOne(user, id);
  }

  async addUpdate(
    user: UserPayload,
    id: string,
    dto: CreateUpdateDto,
  ): Promise<ServiceOrderUpdate> {
    await this.findOne(user, id);
    const update = this.updateRepo.create({
      serviceOrderId: id,
      userId: user.sub,
      message: dto.message,
      status: dto.status ?? null,
    });
    return this.updateRepo.save(update);
  }

  async getUpdates(
    user: UserPayload,
    id: string,
  ): Promise<ServiceOrderUpdate[]> {
    await this.findOne(user, id);
    return this.updateRepo.find({
      where: { serviceOrderId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async createFinding(
    user: UserPayload,
    id: string,
    dto: CreateFindingDto,
    file: Express.Multer.File,
  ): Promise<ServiceOrderFinding> {
    const so = await this.findOne(user, id);
    const buffer = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (!buffer) {
      throw new BadRequestException('Archivo requerido');
    }
    const photoMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoMimes = ['video/mp4'];
    const allowedMimes = [...photoMimes, ...videoMimes];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo inválido. Use: image/jpeg, image/png, image/webp o video/mp4',
      );
    }
    const mediaType = photoMimes.includes(file.mimetype)
      ? ServiceOrderFindingMediaTypeEnum.PHOTO
      : ServiceOrderFindingMediaTypeEnum.VIDEO;
    const maxPhotoSize = 10 * 1024 * 1024; // 10 MB
    const maxVideoSize = 50 * 1024 * 1024; // 50 MB
    const maxSize =
      mediaType === ServiceOrderFindingMediaTypeEnum.PHOTO
        ? maxPhotoSize
        : maxVideoSize;
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `Tamaño máximo: ${maxSize / 1024 / 1024}MB`,
      );
    }
    const ext =
      file.mimetype === 'video/mp4'
        ? 'mp4'
        : (file.mimetype.split('/')[1] ?? 'jpg');
    const key = `service-orders/${id}/findings/${Date.now()}.${ext}`;
    await this.storageService.upload(buffer, key, file.mimetype);
    const finding = this.findingRepo.create({
      serviceOrderId: id,
      userId: user.sub,
      description: dto.description,
      requiresQuotation: dto.requiresQuotation ?? true,
      criticality: dto.criticality ?? FindingCriticalityEnum.MEDIA,
      estimatedMinutes: dto.estimatedMinutes ?? 0,
      estimatedAmount: dto.estimatedAmount ?? 0,
      status: FindingStatusEnum.PENDIENTE,
      mediaType,
      mediaKey: key,
    });
    const saved = await this.findingRepo.save(finding);
    if (saved.requiresQuotation && saved.mediaKey) {
      const client = await this.clientRepo.findOne({
        where: { id: so.ownerId },
      });
      this.eventEmitter.emit(
        'servicio.hallazgo_cotizacion',
        new ServicioHallazgoCotizacionEvent(
          id,
          saved.id,
          so.branchId,
          so.tenantId,
          saved.description,
          saved.mediaKey,
          saved.mediaType,
          {
            email: client?.email ?? undefined,
            phone: client?.phone ?? undefined,
          },
        ),
      );
    }
    return saved;
  }

  async getFindings(
    user: UserPayload,
    id: string,
  ): Promise<ServiceOrderFinding[]> {
    await this.findOne(user, id);
    return this.findingRepo.find({
      where: { serviceOrderId: id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
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
    if (!allowed.some((r) => user.roles?.includes(r))) {
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
    // Se cobra al entregar (forma de pago) o sale con adeudo (cuenta por cobrar).
    if (!dto.conAdeudo && !dto.paymentMethod) {
      throw new BadRequestException(
        'Indica la forma de pago, o marca "entregar con adeudo"',
      );
    }

    // Reglas configurables de "salir con adeudo" (R6): tope de días de la fecha
    // promesa y límite de crédito del cliente. Se validan antes de entregar.
    if (dto.conAdeudo) {
      const tenant = await this.tenantRepo.findOne({
        where: { id: so.tenantId },
      });
      const cfg = tenant?.creditConfig ?? null;
      const cap = cfg?.promiseDaysCap ?? 0;
      if (cap > 0 && dto.fechaPromesaPago) {
        const dias = Math.ceil(
          (new Date(dto.fechaPromesaPago).getTime() - Date.now()) / 86_400_000,
        );
        if (dias > cap) {
          throw new BadRequestException(
            `La fecha promesa no puede exceder ${cap} días.`,
          );
        }
      }
      if (cfg?.creditCheckEnabled) {
        const client = await this.clientRepo.findOne({
          where: { id: so.ownerId },
        });
        const limite =
          client?.creditLimit != null ? Number(client.creditLimit) : null;
        if (limite != null) {
          const filas = await this.dataSource.query<{ s: string }[]>(
            `SELECT COALESCE(SUM(total - paid_amount), 0) AS s
             FROM receivables
             WHERE tenant_id = $1 AND client_id = $2 AND status IN ('OPEN', 'PARTIAL')`,
            [so.tenantId, so.ownerId],
          );
          const usado = Number(filas[0]?.s ?? 0);
          const total = Number(so.total) || 0;
          if (usado + total > limite) {
            throw new BadRequestException(
              `Excede el límite de crédito del cliente ($${limite}). Adeudo actual: $${usado}.`,
            );
          }
        }
      }
    }

    const deliveredAt = new Date();
    await this.soRepo.update(id, {
      status: ServiceOrderStatusEnum.DELIVERED,
      paymentMethod: dto.paymentMethod ?? null,
      cfdiUuid: dto.cfdiUuid ?? null,
      deliveredAt,
    });

    // Salir con adeudo: la unidad sale sin pagar y el saldo queda como cuenta
    // por cobrar del cliente, con su fecha promesa de pago. Es el "vale de
    // salida": el auto sale amparado y el adeudo queda registrado en cartera.
    if (dto.conAdeudo) {
      const total = Number(so.total) || 0;
      if (total > 0) {
        try {
          await this.financeService.create(user, 'receivable', {
            branchId: so.branchId,
            clientId: so.ownerId,
            referenceType: 'ServiceOrder',
            referenceId: so.id,
            concept: `Servicio ${so.folio}`,
            total,
            dueDate: dto.fechaPromesaPago,
          });
        } catch (e) {
          this.logger.warn('Cuenta por cobrar no creada al entregar', e);
        }
      }
    }
    const vehicle = await this.customerVehicleRepo.findOne({
      where: { id: so.vehicleId },
    });
    if (vehicle?.catalogUnitId) {
      const update: Partial<CatalogUnit> = {
        lastServiceDate: deliveredAt,
        lastServiceMileage: so.kmOut ?? so.kmIn,
      };
      await this.catalogUnitRepo.update(vehicle.catalogUnitId, update);
    }
    try {
      await this.cfdiService.generarIngreso('ServiceOrder', id);
    } catch (e) {
      this.logger.warn('CFDI no generado', e);
    }

    // Encuesta post-entrega: una por orden, se envía por WhatsApp vía evento
    try {
      let survey = await this.surveyRepo.findOne({
        where: { serviceOrderId: id },
      });
      if (!survey) {
        const cfg = await this.surveysService.getConfig(
          so.tenantId,
          SurveyAreaEnum.SERVICE,
        );
        survey = await this.surveyRepo.save(
          this.surveyRepo.create({
            tenantId: so.tenantId,
            serviceOrderId: id,
            questions: cfg.questions,
            intro: cfg.intro,
            thanks: cfg.thanks,
          }),
        );
      }
      const client = await this.clientRepo.findOne({
        where: { id: so.ownerId },
      });
      this.eventEmitter.emit(
        'os.entregada',
        new OsEntregadaEvent(
          id,
          so.branchId,
          so.tenantId,
          so.folio,
          survey.token,
          so.trackingToken,
          { email: client?.email ?? undefined, phone: client?.phone ?? undefined },
        ),
      );
    } catch (e) {
      this.logger.warn('Encuesta post-entrega no creada', e);
    }

    return this.findOne(user, id);
  }

  /** Resultados de las encuestas de servicio: general y por pregunta. */
  async resumenEncuestas(user: UserPayload) {
    const surveys = await this.surveyRepo.find({
      where: { tenantId: user.tenantId },
    });
    const respondidas = surveys.filter((s) => s.answeredAt);
    const promedioGeneral =
      respondidas.length > 0
        ? Math.round(
            (respondidas.reduce((a, s) => a + (Number(s.score) || 0), 0) /
              respondidas.length) *
              10,
          ) / 10
        : null;

    // Promedio por pregunta de puntaje (agrupado por id/label del snapshot).
    const acc = new Map<
      string,
      { label: string; suma: number; conteo: number }
    >();
    for (const s of respondidas) {
      for (const q of s.questions ?? []) {
        if (q.type !== 'RATING') continue;
        const val = Number(s.answers?.[q.id]);
        if (!Number.isFinite(val) || val <= 0) continue;
        const cur = acc.get(q.id) ?? { label: q.label, suma: 0, conteo: 0 };
        cur.suma += val;
        cur.conteo += 1;
        acc.set(q.id, cur);
      }
    }
    const preguntas = [...acc.entries()].map(([id, v]) => ({
      id,
      label: v.label,
      promedio: Math.round((v.suma / v.conteo) * 10) / 10,
      respuestas: v.conteo,
    }));

    return {
      total: surveys.length,
      respondidas: respondidas.length,
      promedioGeneral,
      preguntas,
    };
  }

  /** Lista de encuestas de servicio respondidas, con cliente y vehículo. */
  async listaEncuestas(user: UserPayload) {
    return this.surveyRepo
      .createQueryBuilder('s')
      .innerJoin(ServiceOrder, 'so', 'so.id = s.service_order_id')
      .leftJoin('clients', 'c', 'c.id = so.owner_id')
      .leftJoin('customer_vehicles', 'v', 'v.id = so.vehicle_id')
      .select([
        's.id AS "id"',
        'so.folio AS "folio"',
        's.score AS "score"',
        's.answered_at AS "answeredAt"',
        `COALESCE(c.company_name, NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), '')) AS "clientName"`,
        `NULLIF(TRIM(COALESCE(v.make,'') || ' ' || COALESCE(v.model,'')), '') AS "vehicle"`,
        'v.plate AS "plate"',
      ])
      .where('s.tenant_id = :t', { t: user.tenantId })
      .andWhere('s.answered_at IS NOT NULL')
      .orderBy('s.answered_at', 'DESC')
      .getRawMany();
  }

  /** Ficha de una encuesta: cliente, vehículo, servicio realizado y respuestas. */
  async fichaEncuesta(user: UserPayload, surveyId: string) {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId, tenantId: user.tenantId },
    });
    if (!survey) throw new NotFoundException('Encuesta no encontrada');
    const so = await this.findOne(user, survey.serviceOrderId);

    const ops = await this.dataSource.query<{ description: string }[]>(
      `SELECT description FROM service_order_operations
       WHERE service_order_id = $1 ORDER BY created_at ASC`,
      [so.id],
    );

    const clientName = so.owner
      ? so.owner.companyName ||
        `${so.owner.firstName ?? ''} ${so.owner.lastName ?? ''}`.trim()
      : null;

    const respuestas = (survey.questions ?? []).map((q) => ({
      label: q.label,
      type: q.type,
      value: survey.answers?.[q.id] ?? null,
    }));

    return {
      folio: so.folio,
      deliveredAt: so.deliveredAt,
      total: so.total,
      cliente: { nombre: clientName, telefono: so.owner?.phone ?? null },
      vehiculo: so.vehicle
        ? `${so.vehicle.make ?? ''} ${so.vehicle.model ?? ''} ${so.vehicle.year ?? ''}`.trim()
        : null,
      placa: so.vehicle?.plate ?? null,
      trabajos: ops.map((o) => o.description),
      refacciones: (so.parts ?? [])
        .map((p) => p.part?.name ?? null)
        .filter((n): n is string => !!n),
      score: survey.score,
      comment: survey.comment,
      respondidaEn: survey.answeredAt,
      respuestas,
    };
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
    if (!allowed.some((r) => user.roles?.includes(r))) {
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
