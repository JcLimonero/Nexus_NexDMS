import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  /**
   * WhatsApp corta los mensajes de texto en 4096 caracteres. Se valida aquí
   * para que el asesor lo sepa al escribir y no después, con medio mensaje
   * entregado.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;
}

/**
 * Motivos por los que una acción sobre la conversación no procede.
 *
 * Van como código además del texto: la pantalla tiene que distinguir "la tomó
 * alguien más" de "se venció la ventana" para decir qué hacer en cada caso, y
 * comparar contra el mensaje en español es frágil.
 */
export enum ConversationErrorCode {
  /** Otra persona la está atendiendo. */
  ALREADY_TAKEN = 'ALREADY_TAKEN',
  /** No está en un estado que permita tomarla. */
  NOT_TAKEABLE = 'NOT_TAKEABLE',
  /** Nadie la ha tomado todavía. */
  NOT_TAKEN = 'NOT_TAKEN',
  /** Pasaron las 24 h desde el último mensaje del cliente. */
  WINDOW_CLOSED = 'WINDOW_CLOSED',
  /** Meta rechazó el envío. */
  SEND_FAILED = 'SEND_FAILED',
  /** La sucursal no tiene WhatsApp configurado. */
  NO_CREDENTIALS = 'NO_CREDENTIALS',
}
