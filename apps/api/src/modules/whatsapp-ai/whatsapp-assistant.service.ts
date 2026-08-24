import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiClient, InlineImage, ToolCall } from './gemini.client';
import { buildConversationContext } from './conversation-context';
import {
  SYSTEM_PROMPT,
  WORKSHOP_TOOLS,
  WorkshopToolName,
} from './tool-contract';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { UserAvailabilityService } from '../user-availability/user-availability.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentOriginEnum } from '../appointments/entities/appointment.entity';
import { WhatsappConversationsService } from '../whatsapp-conversations/whatsapp-conversations.service';
import { WhatsappEscalationReasonEnum } from '../whatsapp-conversations/entities/whatsapp-conversation.entity';
import { WhatsappMessage } from '../whatsapp-conversations/entities/whatsapp-message.entity';
import { StorageService } from '../../common/storage/storage.service';

export interface AssistantContext {
  branchId: string;
  branchSlug: string;
  conversationId: string;
  phone: string;
}

export interface AssistantResult {
  /** Mensajes para mandar al cliente, en el orden en que el modelo los fue generando. */
  replies: string[];
  escalated: boolean;
  /** Cuando el modelo agendó de verdad, para cerrar la conversación como `BOOKED`. */
  appointmentId?: string;
}

/**
 * Vueltas de herramienta permitidas por mensaje del cliente.
 *
 * Un turno normal gasta como mucho dos (p. ej. consultar_disponibilidad y
 * luego el texto final); cuatro deja margen para agendar sin cortar de tajo
 * una conversación que sí va avanzando.
 */
const MAX_TOOL_ROUNDS = 4;

/** Cuántas fotos ya descargadas se le muestran al modelo en cada turno. */
const MAX_IMAGES = 3;

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Los argumentos de una herramienta vienen de lo que el modelo decidió
 * mandar, no de un DTO validado: `String(valorLoQueSea)` puede volverse
 * `"[object Object]"` sin que nada avise. Sólo se acepta si de verdad ya es
 * texto.
 */
function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Orquesta al asistente: arma el contexto de F1, llama a Gemini, ejecuta las
 * herramientas que pida contra los servicios reales (nunca contra la base
 * directo) y le devuelve el resultado para que decida el siguiente paso.
 *
 * Vive separado de `WhatsappBotService` porque ese servicio también sostiene
 * el flujo de menús de respaldo; mezclar los dos ahí haría difícil saber cuál
 * de los dos "modos" está corriendo en cada método.
 */
@Injectable()
export class WhatsappAssistantService {
  private readonly logger = new Logger(WhatsappAssistantService.name);

  constructor(
    private readonly gemini: GeminiClient,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    private readonly availability: UserAvailabilityService,
    private readonly appointments: AppointmentsService,
    private readonly conversations: WhatsappConversationsService,
    private readonly storage: StorageService,
  ) {}

  /** `false` cuando falta configuración de Vertex AI: quien llama usa el flujo de menús. */
  get isConfigured(): boolean {
    return this.gemini.isConfigured;
  }

  /**
   * `null` significa "el modelo no dio nada útil en su primer intento": quien
   * llama debe caer al flujo de menús en vez de dejar al cliente sin
   * respuesta. Pasado ese primer intento, un fallo ya no regresa `null` —para
   * entonces pudo haber corrido una herramienta con efectos reales (una cita
   * agendada) y fingir que no pasó nada sería peor que avisar y escalar.
   */
  async respond(ctx: AssistantContext): Promise<AssistantResult | null> {
    const messages = await this.conversations.getRecentMessagesForAssistant(
      ctx.conversationId,
    );
    const { turns } = buildConversationContext(messages);
    const images = await this.recentImages(messages);

    const replies: string[] = [];
    let toolResults: { name: string; result: unknown }[] | undefined;
    let escalated = false;
    let appointmentId: string | undefined;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reply = await this.gemini.generate({
        systemPrompt: SYSTEM_PROMPT,
        turns,
        tools: WORKSHOP_TOOLS,
        images: round === 0 ? images : undefined,
        toolResults,
      });

      if (!reply || (round === 0 && !reply.text && !reply.toolCalls.length)) {
        if (round === 0) return null;
        await this.conversations.escalate(
          ctx.conversationId,
          WhatsappEscalationReasonEnum.BOT_WAS_WRONG,
        );
        replies.push(
          'Tuve un problema para terminar de contestarte 😔. Ya avisé a alguien del taller para que te ayude.',
        );
        return { replies, escalated: true, appointmentId };
      }

      if (reply.text) replies.push(reply.text);

      if (!reply.toolCalls.length) {
        return { replies, escalated, appointmentId };
      }

      toolResults = [];
      for (const call of reply.toolCalls) {
        const outcome = await this.runTool(ctx, call);
        toolResults.push({ name: call.name, result: outcome.result });
        if (outcome.escalated) escalated = true;
        if (outcome.appointmentId) appointmentId = outcome.appointmentId;
      }

      // Escaló: el bot se calla desde el siguiente mensaje (misma guarda que
      // ya usa el flujo de menús). Pedirle al modelo otra vuelta después de
      // esto sería contestar por un asesor que ya está por entrar.
      if (escalated) {
        return { replies, escalated, appointmentId };
      }
    }

    // Se acabaron las vueltas sin que el modelo cerrara con texto: mejor una
    // persona que un cliente esperando una respuesta que no va a llegar.
    await this.conversations.escalate(
      ctx.conversationId,
      WhatsappEscalationReasonEnum.BOT_LOOPED,
    );
    replies.push(
      'Creo que no me estoy explicando bien 😅. Ya avisé a alguien del taller para que te ayude directamente.',
    );
    return { replies, escalated: true, appointmentId };
  }

  private async runTool(
    ctx: AssistantContext,
    call: ToolCall,
  ): Promise<{ result: unknown; escalated?: boolean; appointmentId?: string }> {
    const name = call.name as WorkshopToolName;
    switch (name) {
      case WorkshopToolName.LISTAR_SERVICIOS: {
        const types = await this.serviceTypeRepo.find({
          where: { branchId: ctx.branchId, isActive: true },
          order: { name: 'ASC' },
          take: 20,
        });
        return {
          result: types.map((t) => ({
            id: t.id,
            nombre: t.name,
            duracion_min: t.durationMin,
          })),
        };
      }

      case WorkshopToolName.CONSULTAR_DISPONIBILIDAD: {
        const fecha = asString(call.args.fecha);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          return { result: { error: 'fecha inválida, usa AAAA-MM-DD' } };
        }
        const servicioId = asString(call.args.servicio_id) || undefined;

        const slots = await this.availability.getAvailableSlots(
          ctx.branchId,
          fecha,
          undefined,
          undefined,
          servicioId,
        );

        const seen = new Set<string>();
        const horarios: string[] = [];
        for (const s of slots) {
          if (!seen.has(s.start)) {
            seen.add(s.start);
            horarios.push(s.start);
          }
          if (horarios.length >= 6) break;
        }
        return { result: { horarios } };
      }

      case WorkshopToolName.AGENDAR_CITA: {
        try {
          const cita = await this.appointments.createPublic(
            {
              branchSlug: ctx.branchSlug,
              serviceType: asString(call.args.servicio) || 'Servicio',
              scheduledAt: asString(call.args.inicio),
              clientName: asString(call.args.nombre_cliente),
              clientPhone: ctx.phone,
              notes: 'Agendada vía WhatsApp (asistente)',
            },
            AppointmentOriginEnum.WHATSAPP_BOT,
            ctx.conversationId,
          );
          return { result: { ok: true, id: cita.id }, appointmentId: cita.id };
        } catch (e) {
          this.logger.warn(`No se pudo agendar desde el asistente: ${e}`);
          return {
            result: {
              ok: false,
              error:
                'no se pudo agendar, faltan datos o el horario ya no está libre',
            },
          };
        }
      }

      case WorkshopToolName.ESCALAR_A_PERSONA: {
        const motivo = this.parseReason(call.args.motivo);
        await this.conversations.escalate(ctx.conversationId, motivo);
        return { result: { ok: true }, escalated: true };
      }

      default:
        return { result: { error: 'herramienta desconocida' } };
    }
  }

  private parseReason(raw: unknown): WhatsappEscalationReasonEnum {
    const valores = Object.values(WhatsappEscalationReasonEnum) as string[];
    return valores.includes(raw as string)
      ? (raw as WhatsappEscalationReasonEnum)
      : WhatsappEscalationReasonEnum.ASKED_FOR_HUMAN;
  }

  /**
   * Fotos ya bajadas por F5 entre los mensajes recientes, como entrada
   * multimodal.
   *
   * La que acaba de llegar en este mismo mensaje casi nunca está lista
   * todavía: F5 la descarga en segundo plano por una cola. Por eso esto sólo
   * puede mostrarle al modelo fotos de un par de turnos atrás, no la que el
   * cliente mandó ahora mismo — ese mensaje ya se guardó y el asesor la ve en
   * la bandeja aunque el asistente todavía no la "vea".
   */
  private async recentImages(
    messages: WhatsappMessage[],
  ): Promise<InlineImage[]> {
    const conFoto = messages.filter(
      (m) => m.attachmentType === 'image' && m.attachmentKey,
    );
    const ultimas = conFoto.slice(-MAX_IMAGES);

    const images: InlineImage[] = [];
    for (const m of ultimas) {
      const mimeType = this.mimeFromKey(m.attachmentKey!);
      if (!mimeType) continue;
      try {
        const buffer = await this.storage.download(m.attachmentKey!);
        images.push({ mimeType, data: buffer.toString('base64') });
      } catch (e) {
        this.logger.warn(
          `No se pudo leer la foto ${m.attachmentKey} para el asistente`,
          e,
        );
      }
    }
    return images;
  }

  private mimeFromKey(key: string): string | null {
    const ext = key.split('.').pop()?.toLowerCase();
    return ext ? (IMAGE_MIME_BY_EXT[ext] ?? null) : null;
  }
}
