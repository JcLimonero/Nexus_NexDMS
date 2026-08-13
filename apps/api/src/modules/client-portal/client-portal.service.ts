import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomInt, createHash } from 'node:crypto';
import { In, Repository } from 'typeorm';
import {
  PortalMessage,
  PortalMessageSenderEnum,
  PortalUser,
} from './entities/portal.entities';
import { Client } from '../clients/entities/client.entity';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from '../service-orders/entities/service-order.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';
import { DocumentSignature } from '../signatures/entities/document-signature.entity';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';

/** Lo que viaja dentro del token de sesión del cliente. */
export interface PortalSession {
  sub: string;
  clientId: string;
  tenantId: string;
  kind: 'portal';
}

/**
 * Las seis etapas que ve el cliente. Se derivan del estatus interno porque
 * al cliente no le dice nada "WAITING_PARTS": le dice algo "estamos
 * esperando una pieza".
 */
const ETAPAS: { clave: string; nombre: string; estatus: string[] }[] = [
  { clave: 'RECEPCION', nombre: 'Unidad recibida', estatus: ['RECEIVED'] },
  { clave: 'ASIGNACION', nombre: 'Asignada a un técnico', estatus: ['DIAGNOSIS'] },
  { clave: 'DIAGNOSTICO', nombre: 'Diagnóstico', estatus: ['DIAGNOSIS'] },
  {
    clave: 'EJECUCION',
    nombre: 'Ejecución de trabajos',
    estatus: ['IN_PROGRESS', 'WAITING_PARTS'],
  },
  { clave: 'CALIDAD', nombre: 'Calidad y lavado', estatus: ['READY'] },
  { clave: 'ENTREGA', nombre: 'Lista para entrega', estatus: ['DELIVERED'] },
];

const ORDEN_ESTATUS = [
  ServiceOrderStatusEnum.RECEIVED,
  ServiceOrderStatusEnum.DIAGNOSIS,
  ServiceOrderStatusEnum.IN_PROGRESS,
  ServiceOrderStatusEnum.READY,
  ServiceOrderStatusEnum.DELIVERED,
];

/**
 * Portal del cliente.
 *
 * El acceso es por código de un solo uso al WhatsApp que el taller ya tiene
 * registrado. No hay contraseñas a propósito: un taller no debería custodiar
 * credenciales de sus clientes, y el número ya está verificado por el propio
 * uso del servicio.
 */
@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
    @InjectRepository(PortalUser)
    private readonly portalRepo: Repository<PortalUser>,
    @InjectRepository(PortalMessage)
    private readonly msgRepo: Repository<PortalMessage>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Appointment)
    private readonly apptRepo: Repository<Appointment>,
    @InjectRepository(ServiceSurvey)
    private readonly surveyRepo: Repository<ServiceSurvey>,
    @InjectRepository(DocumentSignature)
    private readonly sigRepo: Repository<DocumentSignature>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppProvider,
  ) {}

  // ─── Acceso ─────────────────────────────────────────────────

  private hash(code: string, phone: string): string {
    // El teléfono entra en el hash para que un código no valga en otra cuenta.
    return createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  /** Normaliza a dígitos: los teléfonos llegan con espacios y guiones. */
  private soloDigitos(phone: string): string {
    return (phone ?? '').replace(/\D/g, '');
  }

  /**
   * Manda el código. La respuesta es siempre la misma exista o no el
   * teléfono: si dijéramos "ese número no está registrado", cualquiera
   * podría averiguar qué clientes tiene el taller.
   */
  async solicitarCodigo(phone: string): Promise<{ enviado: true }> {
    const digitos = this.soloDigitos(phone);
    if (digitos.length < 10) {
      throw new BadRequestException('Teléfono no válido');
    }

    const clientes = await this.clientRepo
      .createQueryBuilder('c')
      .where("regexp_replace(coalesce(c.phone,''), '\\D', '', 'g') LIKE :p", {
        p: `%${digitos.slice(-10)}`,
      })
      .limit(1)
      .getMany();

    const cliente = clientes[0];
    if (!cliente) {
      this.logger.warn(`Código pedido para un teléfono sin cliente: …${digitos.slice(-4)}`);
      return { enviado: true };
    }

    let portal = await this.portalRepo.findOne({
      where: { tenantId: cliente.tenantId, phone: digitos },
    });
    if (!portal) {
      portal = this.portalRepo.create({
        tenantId: cliente.tenantId,
        clientId: cliente.id,
        phone: digitos,
        email: cliente.email ?? null,
      });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    portal.otpHash = this.hash(code, digitos);
    portal.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    portal.otpAttempts = 0;
    await this.portalRepo.save(portal);

    await this.whatsapp.sendText(
      digitos,
      `Tu código de acceso es ${code}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`,
    );
    return { enviado: true };
  }

  /** Canjea el código por un token de sesión. */
  async verificarCodigo(
    phone: string,
    code: string,
  ): Promise<{ accessToken: string; nombre: string }> {
    const digitos = this.soloDigitos(phone);
    const portal = await this.portalRepo.findOne({
      where: { phone: digitos },
      relations: ['client'],
    });
    if (!portal?.otpHash || !portal.otpExpiresAt) {
      throw new UnauthorizedException('Código no válido');
    }
    if (portal.otpExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('El código venció, pide uno nuevo');
    }
    if (portal.otpAttempts >= 5) {
      throw new UnauthorizedException(
        'Demasiados intentos. Pide un código nuevo.',
      );
    }
    if (portal.otpHash !== this.hash(code, digitos)) {
      await this.portalRepo.update(portal.id, {
        otpAttempts: portal.otpAttempts + 1,
      });
      throw new UnauthorizedException('Código no válido');
    }

    // El código se quema al usarse.
    await this.portalRepo.update(portal.id, {
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      lastLoginAt: new Date(),
    });

    const payload: PortalSession = {
      sub: portal.id,
      clientId: portal.clientId,
      tenantId: portal.tenantId,
      kind: 'portal',
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '12h',
      secret: this.config.get<string>('JWT_SECRET'),
    });
    const c = portal.client;
    return {
      accessToken,
      nombre:
        c?.companyName ||
        [c?.firstName, c?.lastName].filter(Boolean).join(' ') ||
        'Cliente',
    };
  }

  async sesionDesdeToken(token: string): Promise<PortalSession> {
    try {
      const payload = await this.jwt.verifyAsync<PortalSession>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      // Un token del back office no debe abrir el portal del cliente.
      if (payload.kind !== 'portal') throw new Error('tipo incorrecto');
      return payload;
    } catch {
      throw new UnauthorizedException('Sesión no válida');
    }
  }

  // ─── Datos del cliente ──────────────────────────────────────

  /** Portada: lo que requiere su atención. */
  async inicio(s: PortalSession) {
    const [vehiculos, ordenes, citas, encuestas] = await Promise.all([
      this.vehicleRepo.count({ where: { ownerId: s.clientId } }),
      this.soRepo.count({
        where: {
          ownerId: s.clientId,
          status: In([
            ServiceOrderStatusEnum.RECEIVED,
            ServiceOrderStatusEnum.DIAGNOSIS,
            ServiceOrderStatusEnum.IN_PROGRESS,
            ServiceOrderStatusEnum.WAITING_PARTS,
            ServiceOrderStatusEnum.READY,
          ]),
        },
      }),
      this.apptRepo.count({ where: { clientId: s.clientId } }),
      this.surveyRepo
        .createQueryBuilder('e')
        .innerJoin('service_orders', 'so', 'so.id = e.service_order_id')
        .where('so.owner_id = :c', { c: s.clientId })
        .andWhere('e.answered_at IS NULL')
        .getCount(),
    ]);
    const firmasPendientes = await this.sigRepo
      .createQueryBuilder('f')
      .innerJoin('service_orders', 'so', 'so.id = f.service_order_id')
      .where('so.owner_id = :c', { c: s.clientId })
      .andWhere('f.signed_at IS NULL')
      .andWhere('f.token IS NOT NULL')
      .getCount();

    return {
      vehiculos,
      trabajosEnCurso: ordenes,
      citas,
      encuestasPendientes: encuestas,
      firmasPendientes,
    };
  }

  async misVehiculos(s: PortalSession) {
    const vehiculos = await this.vehicleRepo.find({
      where: { ownerId: s.clientId },
    });
    const ordenes = await this.soRepo.find({
      where: { ownerId: s.clientId },
      order: { createdAt: 'DESC' },
    });
    return vehiculos.map((v) => {
      const raw = v as unknown as Record<string, unknown>;
      const enCurso = ordenes.find(
        (o) =>
          o.vehicleId === v.id &&
          o.status !== ServiceOrderStatusEnum.DELIVERED &&
          o.status !== ServiceOrderStatusEnum.CANCELLED,
      );
      return {
        id: v.id,
        marca: (raw['make'] ?? raw['brand'] ?? null) as string | null,
        modelo: (raw['model'] ?? null) as string | null,
        anio: (raw['year'] ?? null) as number | null,
        placa: (raw['plate'] ?? null) as string | null,
        enTaller: !!enCurso,
        ordenActual: enCurso
          ? { id: enCurso.id, folio: enCurso.folio, status: enCurso.status }
          : null,
      };
    });
  }

  /** Detalle de la orden con las seis etapas. */
  async miOrden(s: PortalSession, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, ownerId: s.clientId },
      relations: ['vehicle', 'branch'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const idxActual = ORDEN_ESTATUS.indexOf(so.status);
    const etapas = ETAPAS.map((e) => {
      const alcanzada = e.estatus.some((st) => {
        const i = ORDEN_ESTATUS.indexOf(st as ServiceOrderStatusEnum);
        return i >= 0 && idxActual >= i;
      });
      return {
        clave: e.clave,
        nombre: e.nombre,
        alcanzada,
        actual: e.estatus.includes(so.status),
      };
    });

    const v = so.vehicle as unknown as Record<string, unknown> | undefined;
    return {
      id: so.id,
      folio: so.folio,
      status: so.status,
      entregaPrevista: so.promisedAt ?? null,
      sucursal: so.branch?.name ?? null,
      problema: so.reportedFault,
      etapas,
      vehiculo: v
        ? {
            marca: (v['make'] ?? v['brand'] ?? null) as string | null,
            modelo: (v['model'] ?? null) as string | null,
            placa: (v['plate'] ?? null) as string | null,
          }
        : null,
    };
  }

  async misCitas(s: PortalSession) {
    const citas = await this.apptRepo.find({
      where: { clientId: s.clientId },
      relations: ['branch', 'vehicle'],
      order: { scheduledAt: 'DESC' },
      take: 50,
    });
    return citas.map((c) => ({
      id: c.id,
      scheduledAt: c.scheduledAt,
      serviceType: c.serviceType,
      status: c.status,
      sucursal: c.branch?.name ?? null,
      placa:
        (c.vehicle as unknown as { plate?: string } | undefined)?.plate ?? null,
    }));
  }

  /** Documentos firmables o ya firmados de sus órdenes. */
  async misDocumentos(s: PortalSession) {
    const firmas = await this.sigRepo
      .createQueryBuilder('f')
      .innerJoin('service_orders', 'so', 'so.id = f.service_order_id')
      .addSelect('so.folio', 'folio')
      .where('so.owner_id = :c', { c: s.clientId })
      .orderBy('f.created_at', 'DESC')
      .getRawAndEntities();

    return firmas.entities.map((f, i) => ({
      id: f.id,
      kind: f.kind,
      folio: firmas.raw[i]?.folio ?? null,
      firmada: !!f.signedAt,
      signedAt: f.signedAt,
      /** Si sigue pendiente y es remota, el enlace para firmarla. */
      token: !f.signedAt ? f.token : null,
    }));
  }

  async misEncuestas(s: PortalSession) {
    const encuestas = await this.surveyRepo
      .createQueryBuilder('e')
      .innerJoin('service_orders', 'so', 'so.id = e.service_order_id')
      .where('so.owner_id = :c', { c: s.clientId })
      .orderBy('e.sent_at', 'DESC')
      .limit(20)
      .getMany();
    return encuestas.map((e) => ({
      id: e.id,
      token: e.token,
      respondida: !!e.answeredAt,
      enviadaEl: e.sentAt,
    }));
  }

  // ─── Conversación con el asesor ─────────────────────────────

  async mensajes(s: PortalSession, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, ownerId: s.clientId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const msgs = await this.msgRepo.find({
      where: { serviceOrderId },
      order: { createdAt: 'ASC' },
    });
    // Al abrir la conversación se dan por leídos los del taller.
    await this.msgRepo.update(
      { serviceOrderId, sender: PortalMessageSenderEnum.STAFF, readAt: undefined },
      { readAt: new Date() },
    );
    return msgs.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
      leido: !!m.readAt,
    }));
  }

  async escribir(s: PortalSession, serviceOrderId: string, body: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, ownerId: s.clientId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    const texto = body?.trim();
    if (!texto) throw new BadRequestException('El mensaje viene vacío');

    return this.msgRepo.save(
      this.msgRepo.create({
        tenantId: so.tenantId,
        serviceOrderId,
        clientId: s.clientId,
        sender: PortalMessageSenderEnum.CLIENT,
        body: texto,
      }),
    );
  }

  // ─── El mismo hilo, visto desde el taller ───────────────────

  async mensajesStaff(tenantId: string, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const msgs = await this.msgRepo.find({
      where: { serviceOrderId },
      order: { createdAt: 'ASC' },
    });
    await this.msgRepo.update(
      {
        serviceOrderId,
        sender: PortalMessageSenderEnum.CLIENT,
        readAt: undefined,
      },
      { readAt: new Date() },
    );
    return msgs.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
      leido: !!m.readAt,
    }));
  }

  async escribirStaff(
    tenantId: string,
    userId: string,
    serviceOrderId: string,
    body: string,
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    const texto = body?.trim();
    if (!texto) throw new BadRequestException('El mensaje viene vacío');

    const msg = await this.msgRepo.save(
      this.msgRepo.create({
        tenantId,
        serviceOrderId,
        clientId: so.ownerId,
        sender: PortalMessageSenderEnum.STAFF,
        userId,
        body: texto,
      }),
    );

    // Aviso por WhatsApp: el cliente no vive dentro del portal, y un mensaje
    // que nadie lee no sirve de nada.
    const cliente = await this.clientRepo.findOne({ where: { id: so.ownerId } });
    if (cliente?.phone) {
      await this.whatsapp.sendText(
        cliente.phone,
        `Tienes un mensaje de tu asesor sobre la orden ${so.folio}: ${texto.slice(0, 120)}`,
      );
    }
    return msg;
  }

  /** Órdenes con mensajes del cliente sin leer, para la bandeja del asesor. */
  async pendientesStaff(tenantId: string) {
    const rows = await this.msgRepo
      .createQueryBuilder('m')
      .select('m.service_order_id', 'serviceOrderId')
      .addSelect('COUNT(*)', 'sinLeer')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.sender = :s', { s: PortalMessageSenderEnum.CLIENT })
      .andWhere('m.read_at IS NULL')
      .groupBy('m.service_order_id')
      .getRawMany<{ serviceOrderId: string; sinLeer: string }>();
    return rows.map((r) => ({
      serviceOrderId: r.serviceOrderId,
      sinLeer: Number(r.sinLeer),
    }));
  }
}
