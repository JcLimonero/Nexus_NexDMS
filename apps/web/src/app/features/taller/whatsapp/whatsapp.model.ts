/**
 * Módulo WhatsApp del taller (prototipo dentro del DMS).
 *
 * ⚠️ Datos de demostración. Aún NO hay backend para estos tableros: los envíos,
 * confirmaciones y conversaciones son simulados en el navegador. Sirve para
 * mostrar el producto y acordar el alcance antes de conectarlo a la API de
 * WhatsApp Business (plantillas, Flows y webhook del bot).
 *
 * Tres pantallas:
 *  - Servicios pendientes: aviso automático cuando el vehículo ya requiere
 *    servicio (por kilometraje o por tiempo).
 *  - Recordatorio de cita: recordatorio de una cita agendada y seguimiento de
 *    su confirmación.
 *  - Agente conversacional: los chats entre el cliente y el asistente.
 */

/** Estado del recordatorio, con la misma progresión que los "checks" de WhatsApp. */
export type RemState = "pendiente" | "enviado" | "entregado" | "leido" | "fallido";

/** Resultado del aviso de servicio: si el cliente terminó agendando. */
export type ServResult = "pendiente" | "agendo" | "no_resp";

/** Estado de la confirmación de una cita. */
export type ConfState =
  | "pendiente"
  | "confirmada"
  | "no_responde"
  | "no_show"
  | "cancelada";

/** Vehículo con servicio pendiente (aún sin cita). */
export interface ServicioPendiente {
  folio: string;
  cliente: string;
  tel: string;
  vehiculo: string;
  /** Por qué se disparó: "Alcanzó 40,000 km", "Última visita hace 6 meses"… */
  motivo: string;
  rem: RemState;
  res: ServResult;
}

/** Cita agendada sobre la que se envía el recordatorio de confirmación. */
export interface CitaRecordatorio {
  folio: string;
  /** Fecha lista para mostrar, p. ej. "hoy · 15:30" o "mañana · 09:00". */
  fecha: string;
  cliente: string;
  tel: string;
  servicio: string;
  rem: RemState;
  con: ConfState;
  /** Minutos que tardó en confirmar, cuando confirmó. */
  tConf: number | null;
}
