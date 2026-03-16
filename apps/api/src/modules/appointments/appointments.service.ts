import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment } from './entities/appointment.entity';
import {
  AppointmentStatusEnum,
  AppointmentOriginEnum,
} from './entities/appointment.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto';
import { FilterAppointmentsDto } from './dto/filter-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { ServiceTypesService } from '../service-types/service-types.service';
import { ServiceTypeCategoryEnum } from '../service-types/entities/service-type.entity';
import { MantenimientoSinRefaccionesEvent } from '../../events/domain-events';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly branchesService: BranchesService,
    private readonly userAvailabilityService: UserAvailabilityService,
    private readonly serviceTypesService: ServiceTypesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Appointment>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('a.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = a.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async create(
    user: UserPayload,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER y ADMIN pueden crear citas internas',
      );
    }

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    let clientName = dto.clientName ?? '';
    let clientPhone = dto.clientPhone ?? '';

    if (dto.clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: dto.clientId, tenantId: user.tenantId },
      });
      if (!client) {
        throw new NotFoundException('Cliente no encontrado');
      }
      clientName = client.isCompany
        ? (client.companyName ?? '')
        : `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
      clientPhone = client.phone;
    }

    if (!clientName || !clientPhone) {
      throw new BadRequestException(
        'Se requiere clientName y clientPhone, o clientId',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Fecha/hora inválida');
    }

    let durationMin = dto.durationMin ?? 60;

    if (dto.serviceTypeId) {
      const serviceType = await this.serviceTypesService.findOne(
        dto.serviceTypeId,
        user.tenantId,
      );
      durationMin = serviceType.durationMin;
      if (
        serviceType.schedulableDays &&
        serviceType.schedulableDays.length > 0
      ) {
        const dayOfWeek = scheduledAt.getDay();
        if (!serviceType.schedulableDays.includes(dayOfWeek)) {
          throw new BadRequestException(
            `El tipo de servicio ${serviceType.name} no se agenda en este día de la semana`,
          );
        }
      }
    }

    const appointment = this.appointmentRepo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      clientId: dto.clientId ?? null,
      vehicleId: dto.vehicleId ?? null,
      mechanicId: dto.mechanicId ?? null,
      origin: AppointmentOriginEnum.INTERNAL,
      status: AppointmentStatusEnum.SCHEDULED,
      serviceType: dto.serviceType,
      serviceTypeId: dto.serviceTypeId ?? null,
      clientName,
      clientPhone,
      notes: dto.notes ?? null,
      scheduledAt,
      durationMin,
    });
    const saved = await this.appointmentRepo.save(appointment);

    if (dto.serviceTypeId) {
      const serviceType = await this.serviceTypesService.findOne(
        dto.serviceTypeId,
        user.tenantId,
      );
      if (serviceType.category === ServiceTypeCategoryEnum.MAINTENANCE) {
        const availability =
          await this.serviceTypesService.checkPartsAvailability(
            dto.serviceTypeId,
            dto.branchId,
            user.tenantId,
          );
        if (!availability.available) {
          this.eventEmitter.emit(
            'mantenimiento.sin_refacciones',
            new MantenimientoSinRefaccionesEvent(
              saved.id,
              dto.branchId,
              user.tenantId,
              serviceType.name,
              scheduledAt,
              availability.missingParts,
            ),
          );
        }
      }
    }

    return saved;
  }

  async createPublic(dto: CreatePublicAppointmentDto): Promise<Appointment> {
    const branch = await this.branchRepo.findOne({
      where: { slug: dto.branchSlug },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Fecha/hora inválida');
    }

    const appointment = this.appointmentRepo.create({
      tenantId: branch.tenantId,
      branchId: branch.id,
      clientId: null,
      vehicleId: null,
      mechanicId: null,
      origin: AppointmentOriginEnum.PUBLIC_PORTAL,
      status: AppointmentStatusEnum.PENDING_CONFIRMATION,
      serviceType: dto.serviceType,
      clientName: dto.clientName,
      clientPhone: dto.clientPhone,
      notes: dto.notes ?? null,
      scheduledAt,
      durationMin: 60,
    });
    return this.appointmentRepo.save(appointment);
  }

  async findAll(
    user: UserPayload,
    filters: FilterAppointmentsDto,
  ): Promise<{
    data: Appointment[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.branch', 'branch')
      .leftJoinAndSelect('a.client', 'client')
      .leftJoinAndSelect('a.vehicle', 'vehicle')
      .leftJoinAndSelect('a.mechanic', 'mechanic')
      .where('a.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (user.roles?.includes('MECHANIC')) {
      qb.andWhere('a.mechanic_id = :mechanicId', { mechanicId: user.sub });
    } else if (filters.mechanicId) {
      qb.andWhere('a.mechanic_id = :mechanicId', {
        mechanicId: filters.mechanicId,
      });
    }
    if (filters.branchId) {
      qb.andWhere('a.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }
    if (filters.dateFrom) {
      qb.andWhere('a.scheduled_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('a.scheduled_at <= :dateTo', {
        dateTo: `${filters.dateTo}T23:59:59.999Z`,
      });
    }

    const [data, total] = await qb
      .orderBy('a.scheduled_at', 'ASC')
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

  async findCalendar(
    user: UserPayload,
    branchId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Appointment[]> {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.branch', 'branch')
      .leftJoinAndSelect('a.client', 'client')
      .leftJoinAndSelect('a.vehicle', 'vehicle')
      .leftJoinAndSelect('a.mechanic', 'mechanic')
      .where('a.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('a.branch_id = :branchId', { branchId })
      .andWhere('a.scheduled_at >= :dateFrom', { dateFrom })
      .andWhere('a.scheduled_at <= :dateTo', {
        dateTo: `${dateTo}T23:59:59.999Z`,
      });
    this.applyScope(qb, user);
    return qb.orderBy('a.scheduled_at', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['branch', 'client', 'vehicle', 'mechanic'],
    });
    if (!appointment) {
      throw new NotFoundException(`Cita ${id} no encontrada`);
    }
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.id = :id', { id })
      .andWhere('a.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Cita ${id} no encontrada`);
    }
    return appointment;
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(user, id);
    const allowedStatuses = [
      AppointmentStatusEnum.PENDING_CONFIRMATION,
      AppointmentStatusEnum.SCHEDULED,
      AppointmentStatusEnum.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'No se puede editar una cita completada, cancelada o no presentada',
      );
    }
    await this.appointmentRepo.update(id, dto as Partial<Appointment>);
    return this.findOne(user, id);
  }

  async confirm(user: UserPayload, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);
    if (appointment.status !== AppointmentStatusEnum.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Solo citas pendientes de confirmación pueden confirmarse',
      );
    }
    await this.appointmentRepo.update(id, {
      status: AppointmentStatusEnum.CONFIRMED,
    });
    return this.findOne(user, id);
  }

  async cancel(
    user: UserPayload,
    id: string,
    _reason?: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(user, id);
    const allowedStatuses = [
      AppointmentStatusEnum.PENDING_CONFIRMATION,
      AppointmentStatusEnum.SCHEDULED,
      AppointmentStatusEnum.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'No se puede cancelar una cita ya completada o cancelada',
      );
    }
    await this.appointmentRepo.update(id, {
      status: AppointmentStatusEnum.CANCELLED,
    });
    return this.findOne(user, id);
  }

  async complete(user: UserPayload, id: string): Promise<Appointment> {
    const appointment = await this.findOne(user, id);
    if (appointment.status !== AppointmentStatusEnum.CONFIRMED) {
      throw new BadRequestException(
        'Solo citas confirmadas pueden marcarse como completadas',
      );
    }
    await this.appointmentRepo.update(id, {
      status: AppointmentStatusEnum.COMPLETED,
    });
    return this.findOne(user, id);
  }

  async getAvailability(
    branchId: string,
    date: string,
    mechanicId?: string,
    durationMin?: number,
    serviceTypeId?: string,
  ): Promise<{ start: string; end: string }[]> {
    const slots = await this.userAvailabilityService.getAvailableSlots(
      branchId,
      date,
      mechanicId,
      durationMin,
      serviceTypeId,
    );
    return slots.map(({ start, end }) => ({ start, end }));
  }
}
