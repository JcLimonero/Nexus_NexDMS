import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import {
  WhatsappRoutingService,
  type WhatsappRoute,
} from './whatsapp-routing.service';

/** Sesión conversacional del bot (30 min de vida en Redis). */
interface BotSession {
  step: 'SERVICE' | 'DATE' | 'SLOT' | 'NAME' | 'CONFIRM';
  serviceTypes?: { id: string; name: string }[];
  serviceTypeId?: string;
  serviceTypeName?: string;
  date?: string; // YYYY-MM-DD
  slots?: string[]; // ISO start de cada opción
  slotStart?: string;
  clientName?: string;
}

/** Un mensaje entrante ya normalizado desde el payload de Meta. */
export interface IncomingMessage {
  /** `id` de Meta. Con él se descartan los reintentos. */
  waMessageId: string;
  from: string;
  type: 'text' | 'image' | 'unsupported';
  text: string;
  /** Nombre del perfil de WhatsApp, cuando Meta lo manda. */
  profileName?: string;
}

const SESSION_TTL_SEC = 30 * 60;

/** Cuánto se recuerda un mensaje ya atendido, para descartar reintentos. */
const SEEN_TTL_SEC = 24 * 60 * 60;

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    private readonly appointmentsService: AppointmentsService,
    private readonly availabilityService: UserAvailabilityService,
    private readonly whatsapp: WhatsAppProvider,
    private readonly routing: WhatsappRoutingService,
  ) {}

  /**
   * Procesa un mensaje entrante y regresa las respuestas enviadas
   * (también se regresan en el body del webhook para pruebas).
   */
  async handleIncoming(
    route: WhatsappRoute,
    msg: IncomingMessage,
  ): Promise<string[]> {
    // Meta reintenta el webhook cuando tarda en recibir el 200. Sin esto, un
    // reintento vuelve a avanzar el flujo y el cliente ve dos respuestas.
    if (await this.alreadySeen(msg.waMessageId)) {
      this.logger.debug(`Mensaje repetido descartado (${msg.waMessageId})`);
      return [];
    }

    const from = msg.from;

    if (msg.type !== 'text') {
      // El flujo de agendado es de menús numerados: una foto no lo hace
      // avanzar. Se contesta para que el cliente no se quede en el aire.
      return this.reply(route, from, [
        'Por ahora sólo puedo leer mensajes de texto 🙏. Escríbeme lo que necesitas y te ayudo a agendar tu cita.',
      ]);
    }

    const body = msg.text.trim();
    const lower = body.toLowerCase();

    if (['cancelar', 'salir', 'reiniciar'].includes(lower)) {
      await this.clearSession(route, from);
      return this.reply(route, from, [
        'Listo, cancelé el proceso. Escribe *hola* cuando quieras agendar una cita. 👋',
      ]);
    }

    const session = await this.getSession(route, from);
    if (!session) {
      return this.startFlow(route, from);
    }

    switch (session.step) {
      case 'SERVICE':
        return this.onServiceChosen(route, from, session, body);
      case 'DATE':
        return this.onDateChosen(route, from, session, body);
      case 'SLOT':
        return this.onSlotChosen(route, from, session, body);
      case 'NAME':
        return this.onNameGiven(route, from, session, body);
      case 'CONFIRM':
        return this.onConfirm(route, from, session, body);
      default:
        await this.clearSession(route, from);
        return this.startFlow(route, from);
    }
  }

  // ─── Pasos del flujo ─────────────────────────────

  private async startFlow(
    route: WhatsappRoute,
    from: string,
  ): Promise<string[]> {
    const types = await this.serviceTypeRepo.find({
      where: { branchId: route.branchId, isActive: true },
      order: { name: 'ASC' },
      take: 9,
    });

    const session: BotSession = {
      step: 'SERVICE',
      serviceTypes: types.map((t) => ({ id: t.id, name: t.name })),
    };
    await this.saveSession(route, from, session);

    const lines = [
      `¡Hola! 👋 Soy el asistente de *${route.branchName}*.`,
      'Te ayudo a agendar tu cita de servicio.',
      '',
      '¿Qué servicio necesitas?',
    ];
    if (types.length > 0) {
      types.forEach((t, i) => lines.push(`*${i + 1}.* ${t.name}`));
      lines.push('', 'Responde con el número, o escribe el servicio.');
    } else {
      lines.push('Escríbeme brevemente qué necesita tu moto/auto.');
    }
    return this.reply(route, from, [lines.join('\n')]);
  }

  private async onServiceChosen(
    route: WhatsappRoute,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    const idx = parseInt(body, 10);
    const types = session.serviceTypes ?? [];
    if (!isNaN(idx) && idx >= 1 && idx <= types.length) {
      session.serviceTypeId = types[idx - 1].id;
      session.serviceTypeName = types[idx - 1].name;
    } else if (body.length >= 3) {
      session.serviceTypeName = body;
    } else {
      return this.reply(route, from, [
        'No te entendí 😅. Responde con el número del servicio o descríbelo.',
      ]);
    }
    session.step = 'DATE';
    await this.saveSession(route, from, session);
    return this.reply(route, from, [
      [
        `Perfecto: *${session.serviceTypeName}*.`,
        '',
        '¿Para qué día quieres tu cita?',
        '*1.* Hoy',
        '*2.* Mañana',
        'O escribe la fecha como AAAA-MM-DD.',
      ].join('\n'),
    ]);
  }

  private async onDateChosen(
    route: WhatsappRoute,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    const today = new Date();
    let date: string | null = null;
    if (body === '1') {
      date = today.toISOString().slice(0, 10);
    } else if (body === '2') {
      const t = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      date = t.toISOString().slice(0, 10);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(body)) {
      date = body;
    }
    if (!date) {
      return this.reply(route, from, [
        'No reconocí la fecha 😅. Responde *1* (hoy), *2* (mañana) o escribe AAAA-MM-DD.',
      ]);
    }

    const slots = await this.availabilityService.getAvailableSlots(
      route.branchId,
      date,
      undefined,
      undefined,
      session.serviceTypeId,
    );

    // Horas distintas, máx. 6 opciones
    const seen = new Set<string>();
    const options: string[] = [];
    for (const s of slots) {
      const key = s.start;
      if (!seen.has(key)) {
        seen.add(key);
        options.push(s.start);
      }
      if (options.length >= 6) break;
    }

    if (options.length === 0) {
      return this.reply(route, from, [
        `No tengo horarios disponibles para ${date} 😔. Intenta con otra fecha (*1* hoy, *2* mañana, o AAAA-MM-DD).`,
      ]);
    }

    session.date = date;
    session.slots = options;
    session.step = 'SLOT';
    await this.saveSession(route, from, session);

    const lines = [`Horarios disponibles para *${date}*:`];
    options.forEach((iso, i) => {
      lines.push(`*${i + 1}.* ${this.formatHour(iso)}`);
    });
    lines.push('', 'Responde con el número del horario.');
    return this.reply(route, from, [lines.join('\n')]);
  }

  private async onSlotChosen(
    route: WhatsappRoute,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    const idx = parseInt(body, 10);
    const slots = session.slots ?? [];
    if (isNaN(idx) || idx < 1 || idx > slots.length) {
      return this.reply(route, from, [
        `Responde con un número del 1 al ${slots.length} para elegir horario.`,
      ]);
    }
    session.slotStart = slots[idx - 1];
    session.step = 'NAME';
    await this.saveSession(route, from, session);
    return this.reply(route, from, ['¿A nombre de quién agendo la cita?']);
  }

  private async onNameGiven(
    route: WhatsappRoute,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body.length < 3) {
      return this.reply(route, from, [
        'Escríbeme tu nombre completo, por favor 🙂',
      ]);
    }
    session.clientName = body;
    session.step = 'CONFIRM';
    await this.saveSession(route, from, session);
    return this.reply(route, from, [
      [
        'Confirma tu cita: ✅',
        `• Servicio: *${session.serviceTypeName}*`,
        `• Fecha: *${session.date}*`,
        `• Hora: *${this.formatHour(session.slotStart!)}*`,
        `• Nombre: *${session.clientName}*`,
        '',
        '*1.* Confirmar   *2.* Cancelar',
      ].join('\n'),
    ]);
  }

  private async onConfirm(
    route: WhatsappRoute,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body !== '1') {
      await this.clearSession(route, from);
      return this.reply(route, from, [
        'Cita cancelada. Escribe *hola* si quieres empezar de nuevo. 👋',
      ]);
    }
    try {
      await this.appointmentsService.createPublic({
        branchSlug: route.branchSlug,
        serviceType: session.serviceTypeName ?? 'Servicio',
        scheduledAt: session.slotStart!,
        clientName: session.clientName!,
        clientPhone: from,
        notes: 'Agendada vía WhatsApp bot',
      });
    } catch (e) {
      this.logger.error('Error creando cita desde bot', e);
      await this.clearSession(route, from);
      return this.reply(route, from, [
        'Ocurrió un problema al agendar tu cita 😔. Intenta de nuevo más tarde o llama a la sucursal.',
      ]);
    }
    await this.clearSession(route, from);
    return this.reply(route, from, [
      [
        '¡Tu cita quedó agendada! 🎉',
        `Te esperamos el *${session.date}* a las *${this.formatHour(session.slotStart!)}*.`,
        'La sucursal confirmará tu cita en breve. Puedes escribir *hola* para agendar otra.',
      ].join('\n'),
    ]);
  }

  // ─── Utilidades ──────────────────────────────────

  private formatHour(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Sale por el número de la sucursal a la que le escribieron, no por env. */
  private async reply(
    route: WhatsappRoute,
    to: string,
    messages: string[],
  ): Promise<string[]> {
    const creds = await this.routing.credentialsFor(route.branchId);
    for (const m of messages) {
      await this.whatsapp.sendText(to, m, creds ?? undefined);
    }
    return messages;
  }

  /**
   * Marca el mensaje como atendido y dice si ya lo estaba.
   *
   * `SET NX` es atómico: si dos reintentos de Meta llegan a la vez, sólo uno
   * se queda con la llave y el otro se descarta.
   */
  private async alreadySeen(waMessageId: string): Promise<boolean> {
    if (!waMessageId) return false;
    try {
      const stored = await this.redis.set(
        `wa:seen:${waMessageId}`,
        '1',
        'EX',
        SEEN_TTL_SEC,
        'NX',
      );
      return stored === null;
    } catch {
      // Sin Redis se prefiere responder de más que quedarse callado.
      return false;
    }
  }

  /**
   * La sesión se guarda por sucursal, no sólo por teléfono: el mismo cliente
   * puede estar agendando en dos sucursales del grupo a la vez y no tienen por
   * qué pisarse.
   */
  private sessionKey(route: WhatsappRoute, phone: string): string {
    return `wabot:${route.branchId}:${phone.replace(/\D/g, '')}`;
  }

  private async getSession(
    route: WhatsappRoute,
    phone: string,
  ): Promise<BotSession | null> {
    const raw = await this.redis.get(this.sessionKey(route, phone));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BotSession;
    } catch {
      return null;
    }
  }

  private async saveSession(
    route: WhatsappRoute,
    phone: string,
    session: BotSession,
  ): Promise<void> {
    await this.redis.set(
      this.sessionKey(route, phone),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SEC,
    );
  }

  private async clearSession(
    route: WhatsappRoute,
    phone: string,
  ): Promise<void> {
    await this.redis.del(this.sessionKey(route, phone));
  }
}
