import {
  WhatsappConversationStateEnum,
  WhatsappEscalationReasonEnum,
} from '../entities/whatsapp-conversation.entity';
import { WhatsappMessageAuthorEnum } from '../entities/whatsapp-message.entity';

/**
 * Cómo sale una conversación hacia la pantalla.
 *
 * Dos decisiones que no vienen del modelo del front:
 *
 * - `lastMessageAt` va en ISO y no como "hace 6 min". Un texto relativo
 *   calculado en el servidor nace viejo: se queda escrito mientras la pantalla
 *   sigue abierta. Formatearlo es cosa de la UI, que sí puede refrescarlo.
 * - El teléfono sale enmascarado. Quien necesite marcarle al cliente lo tiene
 *   en su ficha; la bandeja no necesita repartir números completos.
 */
export interface ConversationSummaryDto {
  id: string;
  /** Nombre del contacto, o el teléfono enmascarado si aún no se sabe. */
  name: string;
  phone: string;
  state: WhatsappConversationStateEnum;
  reason: WhatsappEscalationReasonEnum | null;
  lastMessageAt: string;
  unreadCount: number;
  /** Última línea del chat, para la fila de la lista. */
  lastLine: string;
  branchId: string;
  clientId: string | null;
  assignedTo: { id: string; name: string } | null;
}

export interface MessageDto {
  id: string;
  author: WhatsappMessageAuthorEnum;
  text: string | null;
  /** Quién del taller lo escribió. Sólo cuando `author` es `AGENT`. */
  agentName: string | null;
  attachment: { type: string; url: string | null } | null;
  createdAt: string;
}

export interface ConversationDetailDto extends ConversationSummaryDto {
  messages: MessageDto[];

  /**
   * Si ahora mismo se le puede mandar texto libre a esta persona.
   *
   * Meta sólo deja escribir libremente dentro de las 24 h del último mensaje
   * del cliente; fuera de eso hay que usar una plantilla aprobada. Va en la
   * respuesta para que la pantalla apague el compositor con un motivo, en vez
   * de dejar escribir y que el envío falle después.
   */
  canReplyFreeText: boolean;

  /** Cuándo se cierra esa ventana. `null` si el cliente nunca escribió. */
  windowExpiresAt: string | null;

  /** La cita que salió de este chat, cuando hubo una. */
  appointment: {
    id: string;
    scheduledAt: string;
    serviceType: string;
    status: string;
  } | null;
}
