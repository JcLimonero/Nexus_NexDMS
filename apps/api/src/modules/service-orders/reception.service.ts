import {
  BadRequestException,
  Injectable,
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
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
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

  /** Estado completo de la recepción de una orden. */
  async getReception(user: UserPayload, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      relations: ['vehicle', 'owner', 'branch'],
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
      fotos: fotos.map((f) => ({
        id: f.id,
        specCode: f.specCode,
        angle: f.angle,
        mediaType: f.mediaType,
        storageKey: f.storageKey,
        marks: marcas
          .filter((m) => m.receptionPhotoId === f.id)
          .map((m) => ({
            id: m.id,
            type: m.markType,
            note: m.note,
            x: Number(m.x),
            y: Number(m.y),
          })),
      })),
    };
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

    return this.photoRepo.save(
      this.photoRepo.create({
        receptionChecklistId: checklist.id,
        specCode,
        angle: specCode,
        mediaType: esVideo ? 'VIDEO' : 'PHOTO',
        storageKey: key,
        mimeType: file.mimetype,
      }),
    );
  }

  /** Marca un daño sobre una foto (coordenadas relativas 0–1). */
  async addMark(
    user: UserPayload,
    photoId: string,
    dto: { type: ReceptionMarkTypeEnum; note?: string; x: number; y: number },
  ) {
    const photo = await this.photoRepo.findOne({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    if (dto.x < 0 || dto.x > 1 || dto.y < 0 || dto.y > 1) {
      throw new BadRequestException(
        'Las coordenadas del marcador deben ir de 0 a 1',
      );
    }
    return this.markRepo.save(
      this.markRepo.create({
        receptionPhotoId: photoId,
        markType: dto.type,
        note: dto.note ?? null,
        x: String(dto.x),
        y: String(dto.y),
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
      relations: ['items', 'branch'],
    });
    if (!q) throw new NotFoundException('Cotización no encontrada');

    const so = await this.soRepo.findOne({
      where: { receptionQuotationId: q.id },
      relations: ['vehicle'],
    });
    const v = so?.vehicle as unknown as Record<string, unknown> | undefined;

    return {
      folio: q.folio,
      status: q.status,
      respondida: q.clientRespondedAt !== null,
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
      conceptos: (q.items ?? []).map((i) => ({
        descripcion: i.description,
        cantidad: i.quantity,
        precio: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
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
}
