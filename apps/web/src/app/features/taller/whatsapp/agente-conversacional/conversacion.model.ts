/**
 * Conversaciones del agente conversacional de WhatsApp (prototipo).
 *
 * ⚠️ Datos de demostración. El bot en producción es una máquina de estados
 * rígida (menús numerados, sin imágenes, sin traspaso a una persona). Aquí se
 * dibuja hacia dónde se quiere llevar: el cliente escribe como habla, manda
 * fotos, agenda con WhatsApp Flows y, cuando el asistente se atora, entra un
 * asesor. Es para mostrar el producto, no para validar el comportamiento
 * actual. El texto va en español porque es lo que lee el usuario.
 */

export type Author = "customer" | "bot" | "agent" | "system";

export type ConvState =
  | "BOT"
  | "WITH_AGENT"
  | "BOOKED"
  | "CANCELLED"
  | "EXPIRED"
  /** Le llegó el aviso de servicio pero aún no agenda. */
  | "LEAD";

export type EscalationReason = "ASKED_FOR_HUMAN" | "BOT_LOOPED" | "BOT_WAS_WRONG";

/** Adjunto ilustrado con un SVG en línea (no se carga un archivo real). */
export type AttachmentKind = "dash" | "doc";

/** Datos de la hoja del WhatsApp Flow (calendario nativo + hora). */
export interface FlowData {
  year: number;
  /** Mes 0-11. */
  month: number;
  /** Día resaltado como seleccionado. */
  day: number;
  time: string;
}

/** Detalle que se envía al confirmar: cita, ubicación y teléfonos. */
export interface CitaDetail {
  name: string;
  servicio: string;
  fecha: string;
  folio: string;
}

export interface Message {
  author: Author;
  /** Texto tal como viaja por WhatsApp, con `*negritas*` y saltos de línea. */
  text?: string;
  time: string;
  /** Quién del taller lo escribió. Solo cuando `author` es `"agent"`. */
  agentName?: string;
  attachment?: { kind: AttachmentKind; description: string };
  /** Botones de respuesta rápida de la plantilla. */
  buttons?: string[];
  /** Hoja del WhatsApp Flow (mensaje de sistema). */
  flow?: FlowData;
  /** Mensaje con el detalle de la cita confirmada. */
  detail?: CitaDetail;
}

export interface Conversation {
  id: string;
  name: string;
  phone: string;
  state: ConvState;
  lastActivity: string;
  reason?: EscalationReason;
  /** Referencia de la cita que salió del chat, cuando la hubo. */
  appointmentRef?: string;
  /** Código del cliente en el sistema. */
  code?: string;
  /** Identificador provisional del cliente nuevo (alta al llegar a taller). */
  pre?: string;
  /** El cliente no existe aún en el sistema. */
  nuevo?: boolean;
  /** Etiqueta corta del escenario, para ubicarlo en la lista. */
  tag?: string;
  messages: Message[];
}
