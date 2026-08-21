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
import { User } from '../users/entities/user.entity';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
      advisorId:
        dto.advisorId ??
        (await this.asesorConMenosCarga(
          user.tenantId,
          dto.branchId,
          scheduledAt,
        )),
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

  /**
   * Asesores de servicio disponibles en una sucursal.
   *
   * Son quienes reciben unidades: el rol es lo que habilita la recepción, así
   * que la lista sale de ahí y no de una configuración aparte que habría que
   * mantener sincronizada.
   */
  async asesoresDeSucursal(
    tenantId: string,
    branchId: string,
  ): Promise<{ id: string; nombre: string }[]> {
    const filas = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('user_branches', 'ub', 'ub.user_id = u.id')
      .where('u.tenant_id = :tenantId', { tenantId })
      .andWhere('u.is_active = true')
      .andWhere('ur.role = :rol', { rol: 'RECEPTIONIST' })
      .andWhere('ub.branch_id = :branchId', { branchId })
      .select([
        'u.id AS id',
        'u.first_name AS nombre',
        'u.last_name AS apellido',
      ])
      .getRawMany<{ id: string; nombre: string; apellido: string }>();

    return filas.map((f) => ({
      id: f.id,
      nombre: `${f.nombre ?? ''} ${f.apellido ?? ''}`.trim(),
    }));
  }

  /**
   * Citas que ya tiene cada asesor ese día, para repartir con criterio.
   *
   * Se marca además si puede tomar la cita a esa hora. No se filtra aquí:
   * quien agenda a mano tiene que poder ver a todo el equipo y saber por qué
   * uno aparece descartado —está de vacaciones, o ya salió— en vez de
   * encontrarse una lista corta sin explicación.
   */
  async cargaDeAsesores(
    tenantId: string,
    branchId: string,
    fecha: Date,
  ): Promise<
    {
      id: string;
      nombre: string;
      citas: number;
      disponible: boolean;
      motivo?: string;
      horario: string;
    }[]
  > {
    const asesores = await this.asesoresDeSucursal(tenantId, branchId);
    if (!asesores.length) return [];

    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const conteo = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('a.advisor_id', 'advisorId')
      .addSelect('COUNT(*)', 'total')
      .where('a.branch_id = :branchId', { branchId })
      .andWhere('a.advisor_id IS NOT NULL')
      .andWhere('a.scheduled_at BETWEEN :inicio AND :fin', { inicio, fin })
      // Una cita cancelada no ocupa a nadie; contarla desbalancearía el reparto.
      .andWhere('a.status != :cancelada', {
        cancelada: AppointmentStatusEnum.CANCELLED,
      })
      .groupBy('a.advisor_id')
      .getRawMany<{ advisorId: string; total: string }>();

    const porId = new Map(conteo.map((c) => [c.advisorId, Number(c.total)]));
    const disponibilidad =
      await this.userAvailabilityService.disponibilidadDelDia(
        asesores.map((a) => a.id),
        branchId,
        fecha,
        fecha,
      );

    return asesores.map((a) => {
      const d = disponibilidad.get(a.id);
      return {
        ...a,
        citas: porId.get(a.id) ?? 0,
        disponible: d?.disponible ?? false,
        motivo:
          d?.motivo === 'ausente'
            ? 'Ausente ese día'
            : d?.motivo === 'fuera-de-horario'
              ? 'Fuera de su horario'
              : undefined,
        horario: (d?.ventanas ?? [])
          .map((v) => `${v.inicio}–${v.fin}`)
          .join(', '),
      };
    });
  }

  /**
   * A quién asignar cuando la cita no trae asesor.
   *
   * Reparte por carga del día, no por turno rotativo: lo segundo suena justo
   * pero deja a alguien con seis recepciones seguidas si las cancelaciones no
   * caen parejas. Con empate gana el de menor id, para que el resultado no
   * dependa del orden en que la base devuelva las filas.
   *
   * Solo entra al reparto quien esté en horario a esa hora y no esté ausente:
   * una cita asignada a quien no va a estar es peor que una sin asignar,
   * porque nadie la revisa hasta que el cliente llega.
   */
  private async asesorConMenosCarga(
    tenantId: string,
    branchId: string,
    fecha: Date,
  ): Promise<string | null> {
    const carga = await this.cargaDeAsesores(tenantId, branchId, fecha);
    const candidatos = carga.filter((a) => a.disponible);
    if (!candidatos.length) return null;
    return candidatos.sort(
      (a, b) => a.citas - b.citas || a.id.localeCompare(b.id),
    )[0].id;
  }

  /**
   * `origin` y `whatsappConversationId` no van en `CreatePublicAppointmentDto`
   * a propósito: ese DTO valida el body de `POST /appointments/public`, que
   * es público y sin autenticación. Si esos campos fueran parte del DTO,
   * cualquiera podría mandar `origin: WHATSAPP_BOT` o ligar la cita a la
   * conversación de otro cliente con sólo adivinar un uuid. Sólo un llamador
   * de confianza dentro del API —hoy `WhatsappBotService.onConfirm`— puede
   * ponerlos, pasándolos aparte.
   */
  async createPublic(
    dto: CreatePublicAppointmentDto,
    origin: AppointmentOriginEnum = AppointmentOriginEnum.PUBLIC_PORTAL,
    whatsappConversationId?: string,
  ): Promise<Appointment> {
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
      origin,
      status: AppointmentStatusEnum.PENDING_CONFIRMATION,
      serviceType: dto.serviceType,
      clientName: dto.clientName,
      clientPhone: dto.clientPhone,
      notes: dto.notes ?? null,
      scheduledAt,
      durationMin: 60,
      whatsappConversationId: whatsappConversationId ?? null,
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
      // Propiedad de la entidad (no columna SQL): con skip/take TypeORM
      // resuelve el orderBy vía metadata y truena con nombres snake_case.
      .orderBy('a.scheduledAt', 'ASC')
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
  /**
   * La agenda del día como tablero: asesor por hora.
   *
   * Mismo tablero que el del taller, cambiando el recurso: allí son técnicos
   * y trabajos, aquí asesores y citas. Se resuelve en el servidor por la
   * misma razón —la pantalla no debe fiarse de su propio reloj— y devuelve
   * también la franja del turno de cada asesor, para que se vea a qué hora
   * deja de haber quien reciba.
   */
  async tableroDelDia(user: UserPayload, branchId: string, fecha: string) {
    const dia = new Date(`${fecha}T12:00:00`);
    const citas = await this.findCalendar(user, branchId, fecha, fecha);
    const asesores = await this.asesoresDeSucursal(user.tenantId, branchId);
    const turnos = await this.userAvailabilityService.disponibilidadDelDia(
      asesores.map((a) => a.id),
      branchId,
      dia,
    );

    const bloque = (c: Appointment) => ({
      id: c.id,
      inicio: c.scheduledAt.toISOString(),
      duracionMin: c.durationMin ?? 60,
      cliente: c.clientName,
      servicio: c.serviceType,
      estado: c.status,
      vehiculo: c.vehicle
        ? `${c.vehicle.make} ${c.vehicle.model}`.trim()
        : null,
      asesorId: c.advisorId ?? null,
    });

    const bloques = citas.map(bloque);

    return {
      fecha,
      // La hora del servidor: la pantalla dibuja la línea de "ahora" con
      // ella y no con el reloj del equipo donde esté colgada.
      ahora: new Date().toISOString(),
      asesores: asesores.map((a) => {
        const d = turnos.get(a.id);
        const partes = a.nombre.split(' ').filter(Boolean);
        return {
          id: a.id,
          nombre: a.nombre,
          iniciales:
            `${partes[0]?.[0] ?? ''}${partes[1]?.[0] ?? ''}`.toUpperCase(),
          disponible: d?.disponible ?? false,
          motivo: d?.motivo ?? null,
          ventanas: d?.ventanas ?? [],
          bloques: bloques.filter((b) => b.asesorId === a.id),
        };
      }),
      // Las citas sin asesor se ven aparte: son las que hay que repartir, y
      // esconderlas sería esconder justo el trabajo pendiente.
      sinAsignar: bloques.filter((b) => !b.asesorId),
    };
  }
}
