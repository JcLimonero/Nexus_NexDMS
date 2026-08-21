/**
 * Conversaciones de WhatsApp entre el cliente y la sucursal.
 *
 * Esto es el contrato del API (`/api/v1/whatsapp/conversations`), no un modelo
 * inventado por la pantalla: los nombres y los valores son los que devuelve
 * `whatsapp-conversations.service.ts` en el backend.
 *
 * ⚠️ El asistente que contesta hoy es una máquina de estados con menús
 * numerados: sólo entiende dígitos y fechas `AAAA-MM-DD`. Desde F5 las fotos,
 * audios y documentos que manda el cliente sí se guardan y se ven en el
 * chat —el bot ya no los ignora en la transcripción—, pero tampoco los
 * interpreta: sigue pidiendo que le escriban para avanzar el agendado. Lo que
 * la pantalla ya sostiene —guardar el chat, que un asesor lo tome y
 * responda— funciona de verdad; el asistente conversacional viene después
 * (ver `docs/PLAN_CONVERSACIONES.md`, fase F7).
 */

/** Dónde acabó —o va— la conversación. */
export type ConversationState =
  /** El asistente la está atendiendo. */
  | "BOT"
  /** Una persona la tomó y sigue abierta. */
  | "WITH_AGENT"
  | "BOOKED"
  | "CANCELLED"
  /** El cliente dejó de contestar. */
  | "EXPIRED";

/** Por qué dejó de contestar el asistente y entró una persona. */
export type EscalationReason =
  | "ASKED_FOR_HUMAN"
  | "BOT_LOOPED"
  | "BOT_WAS_WRONG";

/** Quién escribió el mensaje. */
export type MessageAuthor = "CUSTOMER" | "BOT" | "AGENT";

export interface Attachment {
  /** `image`, `audio`, `document`… */
  type: string;
  /**
   * Liga firmada al archivo en B2 (fase F5 del plan). `null` mientras la
   * descarga en segundo plano no termine, o si falló —tipo no permitido,
   * tamaño excedido, Meta ya no lo tenía—: la burbuja dibuja un recuadro en
   * su lugar. El mensaje no se pierde aunque el archivo nunca llegue.
   */
  url: string | null;
}

export interface Message {
  id: string;
  author: MessageAuthor;
  text: string | null;
  /** Quién del taller lo escribió. Sólo cuando `author` es `AGENT`. */
  agentName: string | null;
  attachment: Attachment | null;
  /** ISO. La pantalla lo formatea; el servidor no manda texto relativo. */
  createdAt: string;
}

/** Una fila de la bandeja. */
export interface ConversationSummary {
  id: string;
  /** Nombre del contacto, o el teléfono enmascarado si aún no se sabe. */
  name: string;
  /** Ya viene enmascarado del servidor. */
  phone: string;
  state: ConversationState;
  reason: EscalationReason | null;
  lastMessageAt: string;
  unreadCount: number;
  /** Última línea del chat, resumida por el servidor. */
  lastLine: string;
  branchId: string;
  clientId: string | null;
  assignedTo: { id: string; name: string } | null;
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[];
  /**
   * Si ahora mismo se le puede escribir texto libre.
   *
   * WhatsApp sólo lo permite dentro de las 24 h del último mensaje del
   * cliente. Cuando es `false` el compositor se apaga con el motivo a la
   * vista, en vez de dejar escribir y que el envío falle después.
   */
  canReplyFreeText: boolean;
  /** Cuándo se cierra esa ventana. `null` si el cliente nunca escribió. */
  windowExpiresAt: string | null;
  appointment: {
    id: string;
    scheduledAt: string;
    serviceType: string;
    status: string;
  } | null;
}

/** Motivos por los que el API rechaza una acción sobre la conversación. */
export type ConversationErrorCode =
  | "ALREADY_TAKEN"
  | "NOT_TAKEABLE"
  | "NOT_TAKEN"
  | "WINDOW_CLOSED"
  | "SEND_FAILED"
  | "NO_CREDENTIALS";
