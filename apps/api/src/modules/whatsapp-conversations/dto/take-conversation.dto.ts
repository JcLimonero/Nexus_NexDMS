import { IsIn, IsOptional } from 'class-validator';
import { WhatsappEscalationReasonEnum } from '../entities/whatsapp-conversation.entity';

/**
 * El único motivo que se marca a mano, al tomar la conversación.
 *
 * `ASKED_FOR_HUMAN` y `BOT_LOOPED` los detecta el bot solo (ver
 * `WhatsappBotService.handleIncoming`); `BOT_WAS_WRONG` no se puede detectar
 * desde el servidor —nadie sabe si el bot mintió salvo quien lee la
 * conversación—, así que es el único que este endpoint acepta.
 */
export class TakeConversationDto {
  @IsOptional()
  @IsIn([WhatsappEscalationReasonEnum.BOT_WAS_WRONG])
  reason?: WhatsappEscalationReasonEnum.BOT_WAS_WRONG;
}
