import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Branch } from '../branches/entities/branch.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';

/** Sesión conversacional del bot (30 min de vida en Redis). */
interface BotSession {
  step: 'SERVICE' | 'DATE' | 'SLOT' | 'NAME' | 'CONFIRM';
  branchId: string;
  branchSlug: string;
  serviceTypes?: { id: string; name: string }[];
  serviceTypeId?: string;
  serviceTypeName?: string;
  date?: string; // YYYY-MM-DD
  slots?: string[]; // ISO start de cada opción
  slotStart?: string;
  clientName?: string;
}

const SESSION_TTL_SEC = 30 * 60;

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    private readonly appointmentsService: AppointmentsService,
    private readonly availabilityService: UserAvailabilityService,
    private readonly whatsapp: WhatsAppProvider,
  ) {}

  /**
   * Procesa un mensaje entrante y regresa las respuestas enviadas
   * (también se regresan en el body del webhook para pruebas).
   */
  async handleIncoming(from: string, text: string): Promise<string[]> {
    const body = (text ?? '').trim();
    const lower = body.toLowerCase();

    if (['cancelar', 'salir', 'reiniciar'].includes(lower)) {
      await this.clearSession(from);
      return this.reply(from, [
        'Listo, cancelé el proceso. Escribe *hola* cuando quieras agendar una cita. 👋',
      ]);
    }

    const session = await this.getSession(from);
    if (!session) {
      return this.startFlow(from);
    }

    switch (session.step) {
      case 'SERVICE':
        return this.onServiceChosen(from, session, body);
      case 'DATE':
        return this.onDateChosen(from, session, body);
      case 'SLOT':
        return this.onSlotChosen(from, session, body);
      case 'NAME':
        return this.onNameGiven(from, session, body);
      case 'CONFIRM':
        return this.onConfirm(from, session, body);
      default:
        await this.clearSession(from);
        return this.startFlow(from);
    }
  }

  // ─── Pasos del flujo ─────────────────────────────

  private async startFlow(from: string): Promise<string[]> {
    const branch = await this.resolveBranch();
    if (!branch) {
      return this.reply(from, [
        'Por el momento no puedo agendar citas. Por favor comunícate directamente con la sucursal. 🙏',
      ]);
    }

    const types = await this.serviceTypeRepo.find({
      where: { branchId: branch.id, isActive: true },
      order: { name: 'ASC' },
      take: 9,
    });

    const session: BotSession = {
      step: 'SERVICE',
      branchId: branch.id,
      branchSlug: branch.slug,
      serviceTypes: types.map((t) => ({ id: t.id, name: t.name })),
    };
    await this.saveSession(from, session);

    const lines = [
      `¡Hola! 👋 Soy el asistente de *${branch.name}*.`,
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
    return this.reply(from, [lines.join('\n')]);
  }

  private async onServiceChosen(
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
      return this.reply(from, [
        'No te entendí 😅. Responde con el número del servicio o descríbelo.',
      ]);
    }
    session.step = 'DATE';
    await this.saveSession(from, session);
    return this.reply(from, [
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
      return this.reply(from, [
        'No reconocí la fecha 😅. Responde *1* (hoy), *2* (mañana) o escribe AAAA-MM-DD.',
      ]);
    }

    const slots = await this.availabilityService.getAvailableSlots(
      session.branchId,
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
      return this.reply(from, [
        `No tengo horarios disponibles para ${date} 😔. Intenta con otra fecha (*1* hoy, *2* mañana, o AAAA-MM-DD).`,
      ]);
    }

    session.date = date;
    session.slots = options;
    session.step = 'SLOT';
    await this.saveSession(from, session);

    const lines = [`Horarios disponibles para *${date}*:`];
    options.forEach((iso, i) => {
      lines.push(`*${i + 1}.* ${this.formatHour(iso)}`);
    });
    lines.push('', 'Responde con el número del horario.');
    return this.reply(from, [lines.join('\n')]);
  }

  private async onSlotChosen(
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    const idx = parseInt(body, 10);
    const slots = session.slots ?? [];
    if (isNaN(idx) || idx < 1 || idx > slots.length) {
      return this.reply(from, [
        `Responde con un número del 1 al ${slots.length} para elegir horario.`,
      ]);
    }
    session.slotStart = slots[idx - 1];
    session.step = 'NAME';
    await this.saveSession(from, session);
    return this.reply(from, ['¿A nombre de quién agendo la cita?']);
  }

  private async onNameGiven(
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body.length < 3) {
      return this.reply(from, ['Escríbeme tu nombre completo, por favor 🙂']);
    }
    session.clientName = body;
    session.step = 'CONFIRM';
    await this.saveSession(from, session);
    return this.reply(from, [
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
    from: string,
    session: BotSession,
    body: string,
  ): Promise<string[]> {
    if (body !== '1') {
      await this.clearSession(from);
      return this.reply(from, [
        'Cita cancelada. Escribe *hola* si quieres empezar de nuevo. 👋',
      ]);
    }
    try {
      await this.appointmentsService.createPublic({
        branchSlug: session.branchSlug,
        serviceType: session.serviceTypeName ?? 'Servicio',
        scheduledAt: session.slotStart!,
        clientName: session.clientName!,
        clientPhone: from,
        notes: 'Agendada vía WhatsApp bot',
      });
    } catch (e) {
      this.logger.error('Error creando cita desde bot', e);
      await this.clearSession(from);
      return this.reply(from, [
        'Ocurrió un problema al agendar tu cita 😔. Intenta de nuevo más tarde o llama a la sucursal.',
      ]);
    }
    await this.clearSession(from);
    return this.reply(from, [
      [
        '¡Tu cita quedó agendada! 🎉',
        `Te esperamos el *${session.date}* a las *${this.formatHour(session.slotStart!)}*.`,
        'La sucursal confirmará tu cita en breve. Puedes escribir *hola* para agendar otra.',
      ].join('\n'),
    ]);
  }

  // ─── Utilidades ──────────────────────────────────

  private async resolveBranch(): Promise<Branch | null> {
    const slug = process.env.WHATSAPP_BOT_BRANCH_SLUG;
    if (slug) {
      const b = await this.branchRepo.findOne({ where: { slug } });
      if (b) return b;
    }
    return this.branchRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  private formatHour(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async reply(to: string, messages: string[]): Promise<string[]> {
    for (const m of messages) {
      await this.whatsapp.sendText(to, m);
    }
    return messages;
  }

  private sessionKey(phone: string): string {
    return `wabot:${phone.replace(/\D/g, '')}`;
  }

  private async getSession(phone: string): Promise<BotSession | null> {
    const raw = await this.redis.get(this.sessionKey(phone));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BotSession;
    } catch {
      return null;
    }
  }

  private async saveSession(phone: string, session: BotSession): Promise<void> {
    await this.redis.set(
      this.sessionKey(phone),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SEC,
    );
  }

  private async clearSession(phone: string): Promise<void> {
    await this.redis.del(this.sessionKey(phone));
  }
}
