import {
  WhatsappMessage,
  WhatsappMessageAuthorEnum,
} from '../whatsapp-conversations/entities/whatsapp-message.entity';

/**
 * Prepara la conversación para mandársela al modelo.
 *
 * La transcripción que se guardó en F1 para que el asesor pudiera leer el chat
 * resulta ser, tal cual, la memoria del asistente. Lo único que hace falta es
 * traducirla a turnos y no mandarla entera cada vez.
 */

/** Un turno como lo espera Gemini. */
export interface ContextTurn {
  /**
   * `user` es el cliente; `model` es el taller.
   *
   * El asesor y el asistente van los dos como `model` a propósito: desde el
   * lado del cliente son la misma voz —le contestó el taller—, y marcar al
   * asesor como `user` haría que el modelo creyera que eso lo dijo el cliente
   * y le respondiera a su propio taller.
   */
  role: 'user' | 'model';
  text: string;
}

export interface ContextOptions {
  /** Cuántos turnos recientes se conservan completos. */
  maxTurns?: number;
  /**
   * Tope de caracteres del contexto.
   *
   * Se cuenta en caracteres y no en tokens porque contarlos de verdad exige
   * llamar al modelo, y aquí sólo hace falta un tope que impida que una
   * conversación larga salga cara. Se queda corto a propósito.
   */
  maxChars?: number;
}

export interface BuiltContext {
  turns: ContextTurn[];
  /** `true` si se recortaron turnos viejos: el modelo debe saberlo. */
  truncated: boolean;
  /** Cuántos turnos quedaron fuera. */
  omitted: number;
}

const DEFAULT_MAX_TURNS = 20;
const DEFAULT_MAX_CHARS = 8_000;

/** Lo que se escribe en lugar de un adjunto que el modelo no va a ver. */
const ATTACHMENT_PLACEHOLDER: Record<string, string> = {
  image: '[el cliente envió una foto]',
  audio: '[el cliente envió una nota de voz]',
  document: '[el cliente envió un documento]',
};

/**
 * Arma el contexto a partir de la transcripción.
 *
 * Se recorta por el final —los turnos recientes— porque en una conversación de
 * agendado lo último dicho es lo que decide la respuesta; el saludo de hace
 * media hora no aporta nada y sí cuesta.
 */
export function buildConversationContext(
  messages: WhatsappMessage[],
  options: ContextOptions = {},
): BuiltContext {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  const all = messages
    .map((m) => toTurn(m))
    .filter((t): t is ContextTurn => t !== null);

  // Primero por número de turnos, luego por tamaño: un solo mensaje enorme
  // —alguien que pega el historial de su unidad— no debe llevarse el contexto.
  let kept = all.slice(-maxTurns);
  while (kept.length > 1 && charCount(kept) > maxChars) {
    kept = kept.slice(1);
  }

  return {
    turns: kept,
    truncated: kept.length < all.length,
    omitted: all.length - kept.length,
  };
}

/**
 * `null` cuando el mensaje no aporta nada que el modelo pueda leer: un adjunto
 * sin texto ni tipo conocido no es un turno, es ruido.
 */
function toTurn(m: WhatsappMessage): ContextTurn | null {
  const role: ContextTurn['role'] =
    m.author === WhatsappMessageAuthorEnum.CUSTOMER ? 'user' : 'model';

  const partes: string[] = [];
  if (m.attachmentType) {
    partes.push(
      ATTACHMENT_PLACEHOLDER[m.attachmentType] ??
        '[el cliente envió un archivo]',
    );
  }
  if (m.body?.trim()) partes.push(m.body.trim());

  if (!partes.length) return null;
  return { role, text: partes.join('\n') };
}

function charCount(turns: ContextTurn[]): number {
  return turns.reduce((total, t) => total + t.text.length, 0);
}
