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
import { WhatsappConversationsService } from '../whatsapp-conversations/whatsapp-conversations.service';
import { WhatsappConversationStateEnum } from '../whatsapp-conversations/entities/whatsapp-conversation.entity';
import { WhatsappMessageAuthorEnum } from '../whatsapp-conversations/entities/whatsapp-message.entity';

/**
 * Todo lo que un paso del flujo necesita saber: de qué sucursal es el chat y
 * en qué conversación se está guardando.
 */
interface BotContext {
  route: WhatsappRoute;
  conversationId: string;
}

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
    private readonly conversations: WhatsappConversationsService,
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

    // Se guarda antes de decidir qué hacer: lo que dijo el cliente queda en la
    // transcripción aunque el bot no sepa contestarlo, o aunque no conteste
    // nadie. Es justo lo que hacía falta para poder leer el chat después.
    const conversation = await this.conversations.recordInbound({
      tenantId: route.tenantId,
      branchId: route.branchId,
      phone: from,
      waMessageId: msg.waMessageId,
      body: msg.type === 'text' ? msg.text : undefined,
      profileName: msg.profileName,
      attachmentType: msg.type === 'image' ? 'image' : undefined,
    });

    // Si ya hay una persona atendiendo, el bot se calla. Contestar encima del
    // asesor es peor que no contestar: el cliente recibe dos versiones y no
    // sabe cuál vale.
    if (conversation.state === WhatsappConversationStateEnum.WITH_AGENT) {
      return [];
    }

    const ctx: BotContext = { route, conversationId: conversation.id };

    if (msg.type !== 'text') {
      // El flujo de agendado es de menús numerados: una foto no lo hace
      // avanzar. Se contesta para que el cliente no se quede en el aire.
      return this.reply(ctx, from, [
        'Por ahora sólo puedo leer mensajes de texto 🙏. Escríbeme lo que necesitas y te ayudo a agendar tu cita.',
      ]);
    }

    const body = msg.text.trim();
    const lower = body.toLowerCase();

    if (['cancelar', 'salir', 'reiniciar'].includes(lower)) {
      await this.clearSession(route, from);
      return this.reply(ctx, from, [
        'Listo, cancelé el proceso. Escribe *hola* cuando quieras agendar una cita. 👋',
      ]);
    }

    const session = await this.getSession(route, from);
    if (!session) {
      return this.startFlow(ctx, from);
    }

    switch (session.step) {
      case 'SERVICE':
        return this.onServiceChosen(ctx, from, session, body);
      case 'DATE':
        return this.onDateChosen(ctx, from, session, body);
      case 'SLOT':
        return this.onSlotChosen(ctx, from, session, body);
      case 'NAME':
        return this.onNameGiven(ctx, from, session, body);
      case 'CONFIRM':
        return this.onConfirm(ctx, from, session, body);
      default:
        await this.clearSession(route, from);
        return this.startFlow(ctx, from);
    }
  }

  // ─── Pasos del flujo ─────────────────────────────

  private async startFlow(ctx: BotContext, from: string): Promise<string[]> {
    const types = await this.serviceTypeRepo.find({
      where: { branchId: ctx.route.branchId, isActive: true },
      order: { name: 'ASC' },
      take: 9,
    });

    const session: BotSession = {
      step: 'SERVICE',
      serviceTypes: types.map((t) => ({ id: t.id, name: t.name })),
    };
    await this.saveSession(ctx.route, from, session);

    const lines = [
      `¡Hola! 👋 Soy el asistente de *${ctx.route.branchName}*.`,
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
    return this.reply(ctx, from, [lines.join('\n')]);
  }

  private async onServiceChosen(
    ctx: BotContext,
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
      return this.reply(ctx, from, [
        'No te entendí 😅. Responde con el número del servicio o descríbelo.',
      ]);
    }
    session.step = 'DATE';
    await this.saveSession(ctx.route, from, session);
    return this.reply(ctx, from, [
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
    ctx: BotContext,
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
      return this.reply(ctx, from, [
        'No reconocí la fecha 😅. Responde *1* (hoy), *2* (mañana) o escribe AAAA-MM-DD.',
      ]);
    }

    const slots = await this.availabilityService.getAvailableSlots(
      ctx.route.branchId,
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
      return this.reply(ctx, from, [
        `No tengo horarios disponibles para ${date} 😔. Intenta con otra fecha (*1* hoy, *2* mañana, o AAAA-MM-DD).`,
      ]);
    }

    session.date = date;
    session.slots = options;
    session.step = 'SLOT';
    await this.saveSession(ctx.route, from, session);

    const lines = [`Horarios disponibles para *${date}*:`];
    options.forEach((iso, i) => {
      lines.push(`*${i + 1}.* ${this.formatHour(iso)}`);
    });
    lines.push('', 'Responde con el número del horario.');
    return this.reply(ctx, from, [lines.join('\n')]);
  }

  private async onSlotChosen(
    ctx: BotContext,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    const idx = parseInt(body, 10);
    const slots = session.slots ?? [];
    if (isNaN(idx) || idx < 1 || idx > slots.length) {
      return this.reply(ctx, from, [
        `Responde con un número del 1 al ${slots.length} para elegir horario.`,
      ]);
    }
    session.slotStart = slots[idx - 1];
    session.step = 'NAME';
    await this.saveSession(ctx.route, from, session);
    return this.reply(ctx, from, ['¿A nombre de quién agendo la cita?']);
  }

  private async onNameGiven(
    ctx: BotContext,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body.length < 3) {
      return this.reply(ctx, from, [
        'Escríbeme tu nombre completo, por favor 🙂',
      ]);
    }
    session.clientName = body;
    session.step = 'CONFIRM';
    await this.saveSession(ctx.route, from, session);
    return this.reply(ctx, from, [
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
    ctx: BotContext,
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body !== '1') {
      await this.clearSession(ctx.route, from);
      // La respuesta sale antes de cerrar: una vez cerrada, la conversación ya
      // no es la abierta de ese teléfono y el mensaje se colgaría de otra.
      const salida = await this.reply(ctx, from, [
        'Cita cancelada. Escribe *hola* si quieres empezar de nuevo. 👋',
      ]);
      await this.conversations.close(
        ctx.conversationId,
        WhatsappConversationStateEnum.CANCELLED,
      );
      return salida;
    }

    let appointmentId: string | undefined;
    try {
      const cita = await this.appointmentsService.createPublic({
        branchSlug: ctx.route.branchSlug,
        serviceType: session.serviceTypeName ?? 'Servicio',
        scheduledAt: session.slotStart!,
        clientName: session.clientName!,
        clientPhone: from,
        notes: 'Agendada vía WhatsApp bot',
      });
      appointmentId = cita.id;
    } catch (e) {
      this.logger.error('Error creando cita desde bot', e);
      await this.clearSession(ctx.route, from);
      // La conversación se queda abierta a propósito: el cliente quería una
      // cita y no la tiene, así que es justo el caso que alguien debe atender.
      return this.reply(ctx, from, [
        'Ocurrió un problema al agendar tu cita 😔. Intenta de nuevo más tarde o llama a la sucursal.',
      ]);
    }

    await this.clearSession(ctx.route, from);
    const salida = await this.reply(ctx, from, [
      [
        '¡Tu cita quedó agendada! 🎉',
        `Te esperamos el *${session.date}* a las *${this.formatHour(session.slotStart!)}*.`,
        'La sucursal confirmará tu cita en breve. Puedes escribir *hola* para agendar otra.',
      ].join('\n'),
    ]);
    await this.conversations.close(
      ctx.conversationId,
      WhatsappConversationStateEnum.BOOKED,
      appointmentId,
    );
    return salida;
  }

  // ─── Utilidades ──────────────────────────────────

  private formatHour(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Sale por el número de la sucursal a la que le escribieron, no por env, y
   * deja la respuesta en la transcripción.
   *
   * Se guarda lo que Meta aceptó: si el envío falla, el mensaje no aparece en
   * el chat. Un asesor leyendo la conversación tiene que ver lo que el cliente
   * realmente recibió, no lo que se intentó mandar.
   */
  private async reply(
    ctx: BotContext,
    to: string,
    messages: string[],
  ): Promise<string[]> {
    const creds = await this.routing.credentialsFor(ctx.route.branchId);
    const enviados: string[] = [];

    for (const m of messages) {
      const result = await this.whatsapp.sendText(to, m, creds ?? undefined);
      if (!result.success) {
        this.logger.warn(
          `No se pudo enviar la respuesta del bot a la conversación ${ctx.conversationId}`,
        );
        continue;
      }
      await this.conversations.recordOutbound(ctx.conversationId, {
        author: WhatsappMessageAuthorEnum.BOT,
        body: m,
        waMessageId: result.messageId,
      });
      enviados.push(m);
    }
    return enviados;
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
