import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdditionalWorkService } from './additional-work.service';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ReceptionPhoto } from './entities/reception-photo.entity';
import {
  ReceptionMarkShapeEnum,
  ReceptionMarkTypeEnum,
  ReceptionPhotoMark,
  ReceptionPhotoSpec,
} from './entities/reception-catalog.entities';
import {
  Appointment,
  AppointmentStatusEnum,
} from '../appointments/entities/appointment.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import {
  Quotation,
  QuotationPriceListEnum,
  QuotationStatusEnum,
  QuotationTypeEnum,
} from '../quotations/entities/quotation.entity';
import {
  QuotationItem,
  QuotationLineStatusEnum,
} from '../quotations/entities/quotation-item.entity';
import {
  ServiceOrderOperation,
  ChargeTypeEnum,
  OperationSourceEnum,
} from './entities/service-order-operation.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import {
  Client,
  ClientTypeEnum,
} from '../clients/entities/client.entity';
import { StorageService } from '../../common/storage/storage.service';

export interface ReceptionServiceLine {
  serviceTypeId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

@Injectable()
export class ReceptionService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ReceptionChecklist)
    private readonly checklistRepo: Repository<ReceptionChecklist>,
    @InjectRepository(ReceptionPhoto)
    private readonly photoRepo: Repository<ReceptionPhoto>,
    @InjectRepository(ReceptionPhotoMark)
    private readonly markRepo: Repository<ReceptionPhotoMark>,
    @InjectRepository(ReceptionPhotoSpec)
    private readonly specRepo: Repository<ReceptionPhotoSpec>,
    @InjectRepository(Appointment)
    private readonly apptRepo: Repository<Appointment>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly quotationItemRepo: Repository<QuotationItem>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
    private readonly additionalWork: AdditionalWorkService,
  ) {}

  private readonly logger = new Logger(ReceptionService.name);

  /**
   * Liga temporal para ver la foto en el navegador.
   *
   * El bucket es privado, así que la imagen no se puede servir por su nombre:
   * se firma una liga que caduca. Se firma en cada consulta y no se guarda
   * porque caduca en una hora, y una recepción se abre y se cierra en minutos.
   *
   * Si el almacenamiento no está configurado —una instalación de desarrollo
   * sin credenciales— devuelve nulo en vez de tumbar la pantalla: sin foto la
   * recepción todavía sirve, el marcado depende de la posición del toque.
   */
  private async ligaDeFoto(storageKey: string): Promise<string | null> {
    try {
      return await this.storage.getSignedUrl(storageKey);
    } catch (e) {
      this.logger.warn(
        `No se pudo firmar la liga de ${storageKey}: ${(e as Error).message}`,
      );
      return null;
    }
  }

  // ─── Catálogo de fotos ───────────────────────────

  /**
   * Fotos exigidas para un tipo de vehículo.
   * Si el tenant no definió su catálogo, se usa el set de fábrica
   * (tenantId NULL), así un cliente nuevo opera sin configurar nada.
   */
  async specsForVehicleType(
    tenantId: string,
    vehicleType?: string,
  ): Promise<ReceptionPhotoSpec[]> {
    const propios = await this.specRepo.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    const base = propios.length
      ? propios
      : await this.specRepo.find({
          where: { tenantId: IsNull(), isActive: true },
          order: { sortOrder: 'ASC' },
        });

    if (!vehicleType) return base;
    return base.filter(
      (s) => !s.vehicleTypes?.length || s.vehicleTypes.includes(vehicleType),
    );
  }

  listSpecs(tenantId: string) {
    return this.specsForVehicleType(tenantId);
  }

  async saveSpec(tenantId: string, dto: Partial<ReceptionPhotoSpec>) {
    // Al personalizar por primera vez se copia el set de fábrica, para que
    // el cliente parta de algo y no de una lista vacía.
    const propios = await this.specRepo.count({ where: { tenantId } });
    if (propios === 0) {
      const fabrica = await this.specRepo.find({ where: { tenantId: IsNull() } });
      await this.specRepo.save(
        fabrica.map((f) =>
          this.specRepo.create({ ...f, id: undefined, tenantId }),
        ),
      );
    }

    if (dto.id) {
      const spec = await this.specRepo.findOne({
        where: { id: dto.id, tenantId },
      });
      if (!spec) throw new NotFoundException('Foto de catálogo no encontrada');
      Object.assign(spec, dto, { id: spec.id, tenantId });
      return this.specRepo.save(spec);
    }
    if (!dto.code || !dto.name) {
      throw new BadRequestException('code y name son requeridos');
    }
    return this.specRepo.save(
      this.specRepo.create({ ...dto, id: undefined, tenantId }),
    );
  }

  async removeSpec(tenantId: string, id: string) {
    const spec = await this.specRepo.findOne({ where: { id, tenantId } });
    if (!spec) throw new NotFoundException('Foto de catálogo no encontrada');
    await this.specRepo.remove(spec);
    return { ok: true };
  }

  // ─── Recepción ───────────────────────────────────

  /** Citas del día listas para recibir, con lo que ya se recibió. */
  /**
   * Citas del día listas para recibir.
   *
   * `soloMias` limita a las asignadas al asesor que pregunta: es lo que ve en
   * su portal, donde el resto de la sucursal solo sería ruido.
   */
  async agendaDelDia(
    user: UserPayload,
    branchId: string,
    date: string,
    soloMias = false,
  ) {
    const desde = new Date(`${date}T00:00:00`);
    const hasta = new Date(`${date}T23:59:59.999`);

    const qb = this.apptRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.client', 'client')
      .leftJoinAndSelect('a.vehicle', 'vehicle')
      .leftJoinAndSelect('a.mechanic', 'mechanic')
      .leftJoinAndSelect('a.advisor', 'advisor')
      .where('a.tenant_id = :t', { t: user.tenantId })
      .andWhere('a.branch_id = :b', { b: branchId })
      .andWhere('a.scheduled_at BETWEEN :d1 AND :d2', { d1: desde, d2: hasta })
      .andWhere('a.status NOT IN (:...off)', {
        off: [AppointmentStatusEnum.CANCELLED, AppointmentStatusEnum.NO_SHOW],
      })
      .orderBy('a.scheduledAt', 'ASC');

    if (soloMias) {
      // Las que aún no tienen asesor también aparecen: alguien tiene que
      // recibirlas, y esconderlas dejaría unidades sin atender en el patio.
      qb.andWhere('(a.advisor_id = :yo OR a.advisor_id IS NULL)', {
        yo: user.sub,
      });
    }

    const citas = await qb.getMany();

    const ordenes = await this.soRepo.find({
      where: { tenantId: user.tenantId, branchId },
      select: ['id', 'folio', 'appointmentId', 'status'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    const porCita = new Map(
      ordenes.filter((o) => o.appointmentId).map((o) => [o.appointmentId!, o]),
    );

    return citas.map((c) => {
      const orden = porCita.get(c.id);
      return {
        id: c.id,
        scheduledAt: c.scheduledAt,
        serviceType: c.serviceType,
        status: c.status,
        clientName: c.client
          ? c.client.companyName ||
            [c.client.firstName, c.client.lastName].filter(Boolean).join(' ')
          : c.clientName,
        clientPhone: c.clientPhone,
        vehicle: c.vehicle
          ? {
              id: c.vehicle.id,
              label: [
                (c.vehicle as unknown as { make?: string }).make,
                c.vehicle.model,
              ]
                .filter(Boolean)
                .join(' '),
              plate: (c.vehicle as unknown as { plate?: string }).plate ?? null,
              vehicleType: (c.vehicle as unknown as { vehicleType?: string })
                .vehicleType,
            }
          : null,
        mechanicName: c.mechanic
          ? `${c.mechanic.firstName} ${c.mechanic.lastName}`
          : null,
        advisorId: c.advisorId ?? null,
        advisorName: c.advisor
          ? `${c.advisor.firstName} ${c.advisor.lastName}`
          : null,
        // Si ya se recibió, se enlaza a la orden en vez de ofrecer recibir
        recibida: !!orden,
        serviceOrderId: orden?.id ?? null,
        serviceOrderFolio: orden?.folio ?? null,
      };
    });
  }

  /**
   * Abre la recepción de una cita: crea la orden de servicio en estado
   * RECIBIDA y confirma la cita. Si ya se había recibido, devuelve la orden
   * existente en lugar de duplicarla.
   */
  async recibirCita(
    user: UserPayload,
    appointmentId: string,
    datos?: {
      clientId?: string;
      vehicleId?: string;
      vehiculo?: {
        vehicleType: string;
        make: string;
        model: string;
        year: number;
        plate?: string;
        vin?: string;
        mileage?: number;
        color?: string;
      };
    },
  ) {
    const cita = await this.apptRepo.findOne({
      where: { id: appointmentId, tenantId: user.tenantId },
    });
    if (!cita) throw new NotFoundException('Cita no encontrada');

    const previa = await this.soRepo.findOne({ where: { appointmentId } });
    if (previa) return previa;

    // Las citas del bot llegan sin cliente ni unidad: se dan de alta aquí,
    // que es el momento en que el asesor tiene la unidad enfrente.
    let clientId = cita.clientId ?? datos?.clientId ?? null;
    if (!clientId) {
      const [nombre, ...resto] = (cita.clientName || 'Cliente').trim().split(/\s+/);
      const nuevo = await this.clientRepo.save(
        this.clientRepo.create({
          tenantId: user.tenantId,
          clientType: ClientTypeEnum.INDIVIDUAL,
          isCompany: false,
          firstName: nombre,
          lastName: resto.join(' ') || '—',
          phone: cita.clientPhone || '',
        } as never),
      );
      clientId = (nuevo as unknown as { id: string }).id;
    }

    let vehicleId = cita.vehicleId ?? datos?.vehicleId ?? null;
    if (!vehicleId) {
      if (!datos?.vehiculo) {
        throw new BadRequestException(
          'Captura primero los datos de la unidad para poder recibirla',
        );
      }
      const v = datos.vehiculo;
      if (!v.make || !v.model || !v.vehicleType) {
        throw new BadRequestException(
          'La unidad necesita al menos tipo, marca y modelo',
        );
      }
      const nueva = await this.vehicleRepo.save(
        this.vehicleRepo.create({
          tenantId: user.tenantId,
          ownerId: clientId,
          vehicleType: v.vehicleType,
          make: v.make,
          model: v.model,
          year: v.year || new Date().getFullYear(),
          plate: v.plate || null,
          vin: v.vin || null,
          color: v.color || null,
          mileage: v.mileage ?? 0,
        } as never),
      );
      vehicleId = (nueva as unknown as { id: string }).id;
    }

    // La cita queda enlazada, para que el historial del cliente sea uno solo
    if (!cita.clientId || !cita.vehicleId) {
      await this.apptRepo.update(cita.id, { clientId, vehicleId });
    }

    const folio = await this.dataSource
      .query<{ last_value: number }[]>(
        `INSERT INTO service_order_folio_seq (tenant_id, year, last_value)
         VALUES ($1, $2, 1)
         ON CONFLICT (tenant_id, year) DO UPDATE
           SET last_value = service_order_folio_seq.last_value + 1
         RETURNING last_value`,
        [user.tenantId, new Date().getFullYear()],
      )
      .then(
        (r) =>
          `OS-${new Date().getFullYear()}-${String(r[0]?.last_value ?? 1).padStart(4, '0')}`,
      );

    const orden = await this.soRepo.save(
      this.soRepo.create({
        tenantId: user.tenantId,
        branchId: cita.branchId,
        ownerId: clientId,
        vehicleId,
        userId: user.sub,
        mechanicId: cita.mechanicId ?? null,
        appointmentId: cita.id,
        serviceTypeId: cita.serviceTypeId ?? null,
        folio,
        status: ServiceOrderStatusEnum.RECEIVED,
        reportedFault: cita.serviceType || 'Servicio agendado',
        kmIn: 0,
        total: 0,
        receivedAt: new Date(),
      } as never),
    );

    await this.apptRepo.update(cita.id, {
      status: AppointmentStatusEnum.CONFIRMED,
    });
    return orden;
  }

  /**
   * Recepción sin cita (walk-in): el cliente llega sin agendar. Crea o reutiliza
   * cliente y vehículo y abre la orden en estado Recibida, sin cita, para entrar
   * al mismo walk-around (fotos y daños) que una cita.
   */
  async recibirSinCita(
    user: UserPayload,
    dto: {
      branchId: string;
      clientId?: string;
      cliente?: { firstName: string; lastName?: string; phone: string };
      vehicleId?: string;
      vehiculo?: {
        vehicleType: string;
        make: string;
        model: string;
        year?: number;
        plate?: string;
        vin?: string;
        mileage?: number;
        color?: string;
      };
      reportedFault?: string;
      serviceTypeId?: string;
      kmIn?: number;
    },
  ) {
    if (!dto.branchId) throw new BadRequestException('Falta la sucursal');

    // Cliente: por id, por teléfono existente, o de alta nuevo.
    let clientId = dto.clientId ?? null;
    if (!clientId && dto.cliente?.phone?.trim()) {
      const existente = await this.clientRepo.findOne({
        where: { tenantId: user.tenantId, phone: dto.cliente.phone.trim() },
      });
      clientId = existente?.id ?? null;
    }
    if (!clientId) {
      if (!dto.cliente?.firstName?.trim() || !dto.cliente?.phone?.trim()) {
        throw new BadRequestException(
          'El cliente necesita al menos nombre y teléfono',
        );
      }
      const nuevo = await this.clientRepo.save(
        this.clientRepo.create({
          tenantId: user.tenantId,
          clientType: ClientTypeEnum.INDIVIDUAL,
          isCompany: false,
          firstName: dto.cliente.firstName.trim(),
          lastName: dto.cliente.lastName?.trim() || '—',
          phone: dto.cliente.phone.trim(),
        } as never),
      );
      clientId = (nuevo as unknown as { id: string }).id;
    }

    // Vehículo: existente o de alta nuevo.
    let vehicleId = dto.vehicleId ?? null;
    if (!vehicleId) {
      const v = dto.vehiculo;
      if (!v?.make || !v?.model || !v?.vehicleType) {
        throw new BadRequestException(
          'La unidad necesita al menos tipo, marca y modelo',
        );
      }
      const nueva = await this.vehicleRepo.save(
        this.vehicleRepo.create({
          tenantId: user.tenantId,
          ownerId: clientId,
          vehicleType: v.vehicleType,
          make: v.make,
          model: v.model,
          year: v.year || new Date().getFullYear(),
          plate: v.plate || null,
          vin: v.vin || null,
          color: v.color || null,
          mileage: v.mileage ?? 0,
        } as never),
      );
      vehicleId = (nueva as unknown as { id: string }).id;
    }

    const folio = await this.dataSource
      .query<{ last_value: number }[]>(
        `INSERT INTO service_order_folio_seq (tenant_id, year, last_value)
         VALUES ($1, $2, 1)
         ON CONFLICT (tenant_id, year) DO UPDATE
           SET last_value = service_order_folio_seq.last_value + 1
         RETURNING last_value`,
        [user.tenantId, new Date().getFullYear()],
      )
      .then(
        (r) =>
          `OS-${new Date().getFullYear()}-${String(r[0]?.last_value ?? 1).padStart(4, '0')}`,
      );

    return this.soRepo.save(
      this.soRepo.create({
        tenantId: user.tenantId,
        branchId: dto.branchId,
        ownerId: clientId,
        vehicleId,
        userId: user.sub,
        mechanicId: null,
        appointmentId: null,
        serviceTypeId: dto.serviceTypeId ?? null,
        folio,
        status: ServiceOrderStatusEnum.RECEIVED,
        reportedFault: dto.reportedFault?.trim() || 'Recepción sin cita',
        kmIn: dto.kmIn ?? 0,
        total: 0,
        receivedAt: new Date(),
      } as never),
    );
  }

  /** Estado completo de la recepción de una orden. */
  async getReception(user: UserPayload, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      relations: ['vehicle', 'owner', 'branch', 'user'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId },
    });
    const fotos = checklist
      ? await this.photoRepo.find({
          where: { receptionChecklistId: checklist.id },
        })
      : [];
    const marcas = fotos.length
      ? await this.markRepo
          .createQueryBuilder('m')
          .where('m.reception_photo_id IN (:...ids)', {
            ids: fotos.map((f) => f.id),
          })
          // El orden tiene que ser estable: la pantalla numera las marcas por
          // su posición, y si cambiaran de sitio entre consultas la marca 2
          // de la foto no sería la misma que la fila 2 de la lista.
          .orderBy('m.created_at', 'ASC')
          .getMany()
      : [];

    const vehicleType = (so.vehicle as unknown as { vehicleType?: string })
      ?.vehicleType;
    const specs = await this.specsForVehicleType(user.tenantId, vehicleType);
    const tomadas = new Set(fotos.map((f) => f.specCode).filter(Boolean));

    return {
      serviceOrder: {
        id: so.id,
        folio: so.folio,
        status: so.status,
        reportedFault: so.reportedFault,
        kmIn: so.kmIn,
        receptionQuotationId: so.receptionQuotationId,
        // Para darle al cliente su liga de seguimiento en el mostrador, con
        // la unidad recién recibida: es el momento en que está delante y en
        // que la evidencia de cómo llegó todavía le importa.
        trackingToken: so.trackingToken,
        clientName: so.owner
          ? [so.owner.firstName, so.owner.lastName].filter(Boolean).join(' ') ||
            so.owner.companyName
          : so.receptionName,
        clientPhone: so.owner?.phone ?? so.receptionPhone ?? null,
        /** Quien recibió la unidad: es a quien el cliente va a buscar. */
        advisorName: so.user
          ? [so.user.firstName, so.user.lastName].filter(Boolean).join(' ')
          : null,
      },
      checklist,
      specs: specs.map((s) => ({
        code: s.code,
        name: s.name,
        hint: s.hint,
        required: s.required,
        tomada: tomadas.has(s.code),
      })),
      pendientes: specs
        .filter((s) => s.required && !tomadas.has(s.code))
        .map((s) => s.name),
      // Las ligas se firman a la vez: firmar es cuenta local, no viaje a
      // Backblaze, pero en serie son diez esperas encadenadas sin razón.
      fotos: await Promise.all(
        fotos.map(async (f) => ({
          id: f.id,
          specCode: f.specCode,
          angle: f.angle,
          mediaType: f.mediaType,
          storageKey: f.storageKey,
          url: await this.ligaDeFoto(f.storageKey),
          marks: marcas
            .filter((m) => m.receptionPhotoId === f.id)
            .map((m) => ({
              id: m.id,
              type: m.markType,
              shape: m.shape,
              note: m.note,
              x: Number(m.x),
              y: Number(m.y),
              radius: m.radius === null ? null : Number(m.radius),
            })),
        })),
      ),
    };
  }

  // ─── Consulta de la evidencia ────────────────────

  /**
   * Fotos y marcas de una recepción, para consultar.
   *
   * Separado de `getReception` a propósito: aquella arma la pantalla de
   * captura —catálogo de fotos, cuáles faltan, el checklist editable— y solo
   * se alcanza desde la agenda del día. Esto es lo que se mira meses después,
   * al entregar la unidad o cuando el cliente dice que ese golpe no venía:
   * quien pregunta no va a capturar nada, así que no se le manda con qué.
   */
  private async evidenciaDeChecklist(checklistId: string) {
    const fotos = await this.photoRepo.find({
      where: { receptionChecklistId: checklistId },
      order: { createdAt: 'ASC' },
    });
    if (!fotos.length) return [];

    const marcas = await this.markRepo
      .createQueryBuilder('m')
      .where('m.reception_photo_id IN (:...ids)', {
        ids: fotos.map((f) => f.id),
      })
      // Mismo orden que en la captura: la numeración de las marcas tiene que
      // coincidir con la que vio quien recibió la unidad.
      .orderBy('m.created_at', 'ASC')
      .getMany();

    return Promise.all(
      fotos.map(async (f) => ({
        id: f.id,
        specCode: f.specCode,
        mediaType: f.mediaType,
        url: await this.ligaDeFoto(f.storageKey),
        marks: marcas
          .filter((m) => m.receptionPhotoId === f.id)
          .map((m) => ({
            id: m.id,
            type: m.markType,
            shape: m.shape,
            note: m.note,
            x: Number(m.x),
            y: Number(m.y),
            radius: m.radius === null ? null : Number(m.radius),
          })),
      })),
    );
  }

  /** Nombres del catálogo, para que la foto no se anuncie como "FRONT". */
  private async nombresDeSpecs(tenantId: string): Promise<Map<string, string>> {
    const specs = await this.specsForVehicleType(tenantId);
    return new Map(specs.map((s) => [s.code, s.name]));
  }

  /** Evidencia de una sola orden. */
  async evidenciaDeOrden(tenantId: string, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId },
      relations: ['vehicle'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId },
    });
    // Sin recepción no hay evidencia, y eso no es un error: hay órdenes que
    // se abren en el mostrador sin pasar por la recepción guiada.
    if (!checklist) {
      return { folio: so.folio, recibidaEl: so.receivedAt, checklist: null, fotos: [] };
    }

    const nombres = await this.nombresDeSpecs(tenantId);
    const fotos = await this.evidenciaDeChecklist(checklist.id);
    return {
      folio: so.folio,
      recibidaEl: so.receivedAt,
      checklist: {
        kmIn: checklist.kmIn,
        fuelLevel: checklist.fuelLevel,
        hasSpareTire: checklist.hasSpareTire,
        hasTools: checklist.hasTools,
        hasDocuments: checklist.hasDocuments,
        hasMats: checklist.hasMats,
        observations: checklist.observations,
        damageDescription: checklist.damageDescription,
      },
      fotos: fotos.map((f) => ({
        ...f,
        nombre: nombres.get(f.specCode ?? '') ?? f.specCode,
      })),
    };
  }

  /**
   * Todas las recepciones de un vehículo, de la más reciente a la más vieja.
   *
   * Es la vista que resuelve la discusión de verdad: si el golpe ya venía en
   * la visita anterior, aquí se ve sin abrir orden por orden.
   */
  async evidenciaDeVehiculo(tenantId: string, vehicleId: string) {
    const ordenes = await this.soRepo.find({
      where: { tenantId, vehicleId },
      order: { createdAt: 'DESC' },
    });
    if (!ordenes.length) return [];

    const checklists = await this.checklistRepo
      .createQueryBuilder('c')
      .where('c.service_order_id IN (:...ids)', {
        ids: ordenes.map((o) => o.id),
      })
      .getMany();
    if (!checklists.length) return [];

    const nombres = await this.nombresDeSpecs(tenantId);
    const porOrden = new Map(checklists.map((c) => [c.serviceOrderId, c]));

    const visitas = await Promise.all(
      ordenes
        .filter((o) => porOrden.has(o.id))
        .map(async (o) => {
          const c = porOrden.get(o.id)!;
          const fotos = await this.evidenciaDeChecklist(c.id);
          return {
            serviceOrderId: o.id,
            folio: o.folio,
            recibidaEl: o.receivedAt ?? o.createdAt,
            kmIn: c.kmIn,
            damageDescription: c.damageDescription,
            fotos: fotos.map((f) => ({
              ...f,
              nombre: nombres.get(f.specCode ?? '') ?? f.specCode,
            })),
          };
        }),
    );
    // Una recepción sin una sola foto no aporta nada a la consulta.
    return visitas.filter((v) => v.fotos.length);
  }

  /** Evidencia de todas las unidades de un cliente, agrupada por unidad. */
  async evidenciaDeCliente(tenantId: string, clientId: string) {
    const vehiculos = await this.vehicleRepo.find({
      where: { tenantId, ownerId: clientId },
    });
    const grupos = await Promise.all(
      vehiculos.map(async (v) => ({
        vehicleId: v.id,
        descripcion: [v.make, v.model, v.year].filter(Boolean).join(' '),
        plate: v.plate,
        visitas: await this.evidenciaDeVehiculo(tenantId, v.id),
      })),
    );
    return grupos.filter((g) => g.visitas.length);
  }

  /**
   * Evidencia para el cliente, por la liga de seguimiento que ya recibe.
   *
   * Va por el token de la orden y no por su identificador: el token es lo
   * único que el cliente tiene, y limita lo que puede pedir a su propia
   * unidad. Solo se entrega la recepción de esa orden, nunca su historial.
   */
  async evidenciaPublica(trackingToken: string) {
    const so = await this.soRepo.findOne({ where: { trackingToken } });
    if (!so) throw new NotFoundException('Orden no encontrada');
    return this.evidenciaDeOrden(so.tenantId, so.id);
  }

  /** Guarda o actualiza los datos de recepción de la unidad. */
  async saveChecklist(
    user: UserPayload,
    serviceOrderId: string,
    dto: {
      kmIn: number;
      fuelLevel: number;
      hasSpareTire?: boolean;
      hasTools?: boolean;
      hasDocuments?: boolean;
      hasMats?: boolean;
      observations?: string;
      damageDescription?: string;
    },
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    if (dto.fuelLevel < 0 || dto.fuelLevel > 100) {
      throw new BadRequestException('El nivel de combustible va de 0 a 100');
    }

    let checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId },
    });
    if (checklist) {
      Object.assign(checklist, dto, { userId: user.sub });
    } else {
      checklist = this.checklistRepo.create({
        ...dto,
        serviceOrderId,
        userId: user.sub,
        hasSpareTire: dto.hasSpareTire ?? false,
        hasTools: dto.hasTools ?? false,
        hasDocuments: dto.hasDocuments ?? false,
        hasMats: dto.hasMats ?? false,
      });
    }
    const saved = await this.checklistRepo.save(checklist);
    // El kilometraje de entrada vive también en la orden
    if (so.kmIn !== dto.kmIn) {
      await this.soRepo.update(so.id, { kmIn: dto.kmIn });
    }
    return saved;
  }

  /** Sube una foto o video de recepción contra un código del catálogo. */
  async uploadMedia(
    user: UserPayload,
    serviceOrderId: string,
    specCode: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const checklist = await this.checklistRepo.findOne({
      where: { serviceOrderId },
    });
    if (!checklist) {
      throw new BadRequestException(
        'Captura primero los datos de recepción de la unidad',
      );
    }

    const esVideo = file.mimetype.startsWith('video/');
    const key = await this.storage.upload(
      file.buffer,
      `recepcion/${serviceOrderId}/${specCode}-${Date.now()}`,
      file.mimetype,
    );

    // Una foto por código: volver a tomarla reemplaza la anterior
    const previa = await this.photoRepo.findOne({
      where: { receptionChecklistId: checklist.id, specCode },
    });
    if (previa) await this.photoRepo.remove(previa);

    const foto = await this.photoRepo.save(
      this.photoRepo.create({
        receptionChecklistId: checklist.id,
        specCode,
        angle: specCode,
        mediaType: esVideo ? 'VIDEO' : 'PHOTO',
        storageKey: key,
        mimeType: file.mimetype,
      }),
    );
    // Se devuelve ya con la liga y sin marcas, es decir con la misma forma que
    // tienen las fotos en `getReception`: quien suba puede pintarla enseguida
    // sin volver a pedir la recepción entera.
    return { ...foto, url: await this.ligaDeFoto(foto.storageKey), marks: [] };
  }

  /** Marca un daño sobre una foto (coordenadas relativas 0–1). */
  async addMark(
    user: UserPayload,
    photoId: string,
    dto: {
      type: ReceptionMarkTypeEnum;
      shape?: ReceptionMarkShapeEnum;
      note?: string;
      x: number;
      y: number;
      radius?: number;
    },
  ) {
    const photo = await this.photoRepo.findOne({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    if (dto.x < 0 || dto.x > 1 || dto.y < 0 || dto.y > 1) {
      throw new BadRequestException(
        'Las coordenadas del marcador deben ir de 0 a 1',
      );
    }

    const esCirculo = dto.shape === ReceptionMarkShapeEnum.CIRCLE;
    if (esCirculo && !(dto.radius && dto.radius > 0 && dto.radius <= 1)) {
      throw new BadRequestException(
        'Una marca de área necesita un radio entre 0 y 1',
      );
    }

    return this.markRepo.save(
      this.markRepo.create({
        receptionPhotoId: photoId,
        markType: dto.type,
        // Sin forma explícita es un punto: así siguen valiendo las marcas que
        // ya se guardaban antes de que existiera el círculo.
        shape: esCirculo
          ? ReceptionMarkShapeEnum.CIRCLE
          : ReceptionMarkShapeEnum.POINT,
        note: dto.note ?? null,
        x: String(dto.x),
        y: String(dto.y),
        radius: esCirculo ? String(dto.radius) : null,
      }),
    );
  }

  async removeMark(id: string) {
    const mark = await this.markRepo.findOne({ where: { id } });
    if (!mark) throw new NotFoundException('Marcador no encontrado');
    await this.markRepo.remove(mark);
    return { ok: true };
  }

  // ─── Servicios a realizar → cotización ───────────

  /** Servicios predefinidos disponibles para cotizar en la recepción. */
  serviciosPredefinidos(tenantId: string, branchId?: string) {
    const qb = this.serviceTypeRepo
      .createQueryBuilder('st')
      .where('st.tenant_id = :t', { t: tenantId })
      .andWhere('st.is_active = true')
      .orderBy('st.name', 'ASC');
    if (branchId) {
      qb.andWhere('(st.branch_id = :b OR st.branch_id IS NULL)', {
        b: branchId,
      });
    }
    return qb.getMany();
  }

  private async folioCotizacion(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const r = await this.dataSource.query<{ last_value: number }[]>(
      `INSERT INTO quotation_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE
         SET last_value = quotation_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    return `COT-${year}-${String(r[0]?.last_value ?? 1).padStart(4, '0')}`;
  }

  /**
   * Genera la cotización de la recepción con los servicios elegidos
   * (predefinidos y extras) y la deja lista para que el cliente responda.
   */
  async cotizarServicios(
    user: UserPayload,
    serviceOrderId: string,
    dto: { lines: ReceptionServiceLine[]; conditions?: string },
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      relations: ['branch', 'owner'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    if (!dto.lines?.length) {
      throw new BadRequestException('Selecciona al menos un servicio');
    }

    const taxRate = Number(so.branch?.taxRate) || 0.16;
    const items = dto.lines.map((l) => {
      const cantidad = l.quantity ?? 1;
      if (l.unitPrice < 0) {
        throw new BadRequestException('El precio no puede ser negativo');
      }
      return {
        description: l.description,
        quantity: cantidad,
        unitPrice: l.unitPrice,
        subtotal: cantidad * l.unitPrice,
      };
    });
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const quotationId = await this.dataSource.transaction(async (em) => {
      const folio = await this.folioCotizacion(user.tenantId);
      const q = em.create(Quotation, {
        tenantId: user.tenantId,
        branchId: so.branchId,
        clientId: so.ownerId,
        userId: user.sub,
        type: QuotationTypeEnum.SERVICE,
        folio,
        // Nace enviada: el cliente la responde desde el enlace público
        status: QuotationStatusEnum.SENT,
        priceList: QuotationPriceListEnum.PUBLIC,
        subtotal,
        discountPct: 0,
        discountAmount: 0,
        taxAmount,
        total,
        conditions: dto.conditions ?? null,
      } as never);
      const saved = (await em.save(q)) as unknown as Quotation;

      for (const it of items) {
        await em.save(
          em.create(QuotationItem, {
            quotationId: saved.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: 0,
            subtotal: it.subtotal,
          } as never),
        );
      }
      await em.update(ServiceOrder, so.id, {
        receptionQuotationId: saved.id,
      });
      return saved.id;
    });

    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId },
    });

    // Aviso al cliente con el enlace para aceptar o rechazar
    const cliente = await this.clientRepo.findOne({ where: { id: so.ownerId } });
    if (cliente?.phone && quotation) {
      this.events.emit('recepcion.cotizacion_enviada', {
        serviceOrderId: so.id,
        quotationId: quotation.id,
        folio: quotation.folio,
        total,
        clientToken: quotation.clientToken,
        tenantId: so.tenantId,
        branchId: so.branchId,
        client: { phone: cliente.phone, email: cliente.email ?? undefined },
      });
    }

    return quotation;
  }

  // ─── Respuesta del cliente (público, por token) ──

  async cotizacionPublica(token: string) {
    const q = await this.quotationRepo.findOne({
      where: { clientToken: token },
      relations: ['items', 'items.photos', 'branch'],
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');

    const so = await this.soRepo.findOne({
      where: { receptionQuotationId: q.id },
      relations: ['vehicle'],
    });
    const v = so?.vehicle as unknown as Record<string, unknown> | undefined;

    // Cada concepto llega con su urgencia, la nota del técnico, su estado y las
    // fotos firmadas, para que el cliente decida trabajo por trabajo.
    const conceptos = await Promise.all(
      (q.items ?? []).map(async (i) => ({
        id: i.id,
        descripcion: i.description,
        cantidad: i.quantity,
        precio: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
        urgencia: i.urgency,
        notaTecnico: i.technicianNote,
        estado: i.lineStatus,
        fotos: (
          await Promise.all(
            (i.photos ?? []).map((p) => this.ligaDeFoto(p.storageKey)),
          )
        ).filter((u): u is string => !!u),
      })),
    );

    return {
      folio: q.folio,
      status: q.status,
      respondida: q.clientRespondedAt !== null,
      firmada: q.signatureKey !== null,
      subtotal: Number(q.subtotal),
      taxAmount: Number(q.taxAmount),
      total: Number(q.total),
      conditions: q.conditions,
      sucursal: q.branch?.name ?? null,
      orden: so ? { folio: so.folio, trackingToken: so.trackingToken } : null,
      vehiculo: v
        ? {
            marca: (v['make'] ?? v['brand'] ?? null) as string | null,
            modelo: (v['model'] ?? null) as string | null,
            placa: (v['plate'] ?? null) as string | null,
          }
        : null,
      conceptos,
    };
  }

  /**
   * El cliente acepta o rechaza. Al aceptar, la orden pasa a diagnóstico:
   * es el arranque formal del servicio autorizado.
   */
  async responderCotizacion(
    token: string,
    dto: { acepta: boolean; nota?: string },
  ) {
    const q = await this.quotationRepo.findOne({
      where: { clientToken: token },
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.clientRespondedAt) {
      throw new BadRequestException('Esta cotización ya fue respondida');
    }

    q.status = dto.acepta
      ? QuotationStatusEnum.ACCEPTED
      : QuotationStatusEnum.REJECTED;
    q.clientRespondedAt = new Date();
    q.clientResponseNote = dto.nota?.trim() || null;
    await this.quotationRepo.save(q);

    const so = await this.soRepo.findOne({
      where: { receptionQuotationId: q.id },
    });
    if (so && dto.acepta && so.status === ServiceOrderStatusEnum.RECEIVED) {
      await this.soRepo.update(so.id, {
        status: ServiceOrderStatusEnum.DIAGNOSIS,
      });
    }

    // La misma pantalla pública sirve para la cotización de recepción y para
    // los trabajos adicionales. Si esta cotización venía de hallazgos, hay
    // que resolverlos y convertirlos en operaciones de la orden.
    const adicionales = await this.additionalWork.aplicarRespuesta(
      q.id,
      dto.acepta,
    );

    return {
      ok: true,
      aceptada: dto.acepta,
      ...(adicionales.hallazgos > 0
        ? {
            trabajosAdicionales: adicionales.hallazgos,
            operacionesCreadas: adicionales.operaciones,
          }
        : {}),
    };
  }

  /**
   * Autorización parcial: el cliente decide cada línea (acepta / rechaza /
   * pide llamada) y firma. Lo aceptado arranca el servicio; lo rechazado
   * queda guardado en la línea para re-ofertar en otra visita.
   */
  async responderCotizacionPorLinea(
    token: string,
    dto: {
      lineas: {
        itemId: string;
        decision: QuotationLineStatusEnum;
        nota?: string;
      }[];
      firma?: string;
    },
  ) {
    const q = await this.quotationRepo.findOne({
      where: { clientToken: token },
      relations: ['items'],
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.clientRespondedAt) {
      throw new BadRequestException('Esta cotización ya fue respondida');
    }

    const porId = new Map((q.items ?? []).map((i) => [i.id, i]));
    for (const l of dto.lineas ?? []) {
      const item = porId.get(l.itemId);
      if (!item) continue;
      item.lineStatus = l.decision;
      item.clientLineNote = l.nota?.trim() || null;
    }
    const items = [...porId.values()];
    await this.quotationItemRepo.save(items);

    const aceptadas = items.filter(
      (i) => i.lineStatus === QuotationLineStatusEnum.ACCEPTED,
    ).length;
    const rechazadas = items.filter(
      (i) => i.lineStatus === QuotationLineStatusEnum.REJECTED,
    ).length;
    const llamadas = items.filter(
      (i) => i.lineStatus === QuotationLineStatusEnum.CALLBACK,
    ).length;

    // La firma llega como data URL; se guarda como imagen en almacenamiento
    // privado y solo se conserva su llave. Si el almacenamiento falla no se
    // tira la respuesta: la decisión del cliente pesa más que la constancia.
    if (dto.firma) {
      const m = /^data:(image\/\w+);base64,(.+)$/.exec(dto.firma);
      if (m) {
        try {
          const key = `presupuestos/${q.id}/firma-${Date.now()}.png`;
          await this.storage.upload(Buffer.from(m[2], 'base64'), key, m[1]);
          q.signatureKey = key;
        } catch (e) {
          this.logger.warn(
            `No se pudo guardar la firma de ${q.folio}: ${(e as Error).message}`,
          );
        }
      }
    }

    q.status =
      aceptadas > 0
        ? QuotationStatusEnum.ACCEPTED
        : rechazadas > 0
          ? QuotationStatusEnum.REJECTED
          : q.status;
    q.clientRespondedAt = new Date();
    await this.quotationRepo.save(q);

    // El trabajo aprobado entra a la orden (materialización); si estaba recién
    // recibida, arranca el servicio.
    const so = await this.soRepo.findOne({
      where: { receptionQuotationId: q.id },
    });
    if (so && aceptadas > 0) {
      await this.materializarLineas(
        so.id,
        items.filter((i) => i.lineStatus === QuotationLineStatusEnum.ACCEPTED),
      );
      if (so.status === ServiceOrderStatusEnum.RECEIVED) {
        await this.soRepo.update(so.id, {
          status: ServiceOrderStatusEnum.DIAGNOSIS,
        });
      }
    }

    return {
      ok: true,
      aceptadas,
      rechazadas,
      llamadas,
      firmada: !!q.signatureKey,
    };
  }

  /**
   * Las líneas que el cliente aprobó entran a la orden como trabajo real: las
   * refacciones a `service_order_parts` y la mano de obra a
   * `service_order_operations`, para que el técnico fiche y la caja cobre.
   */
  private async materializarLineas(
    serviceOrderId: string,
    aceptadas: QuotationItem[],
  ): Promise<void> {
    if (!aceptadas.length) return;
    const opRepo = this.dataSource.getRepository(ServiceOrderOperation);
    const partRepo = this.dataSource.getRepository(ServiceOrderPart);
    let orden = await opRepo.count({ where: { serviceOrderId } });

    const ops: ServiceOrderOperation[] = [];
    const parts: ServiceOrderPart[] = [];
    for (const it of aceptadas) {
      if (it.partId) {
        parts.push(
          partRepo.create({
            serviceOrderId,
            partId: it.partId,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            subtotal: Number(it.subtotal),
            notes: 'Autorizado en presupuesto',
          }),
        );
      } else {
        ops.push(
          opRepo.create({
            serviceOrderId,
            description: it.description,
            standardMinutes: 0,
            laborPrice: Number(it.subtotal),
            chargeType: ChargeTypeEnum.CLIENT,
            source: OperationSourceEnum.RECEPTION,
            sortOrder: orden++,
          }),
        );
      }
    }
    if (parts.length) await partRepo.save(parts);
    if (ops.length) await opRepo.save(ops);
  }
}
