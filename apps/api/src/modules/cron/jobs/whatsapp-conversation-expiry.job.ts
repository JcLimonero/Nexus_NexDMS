import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  WhatsappConversation,
  WhatsappConversationStateEnum,
} from '../../whatsapp-conversations/entities/whatsapp-conversation.entity';

/**
 * Da por terminada la conversación a la que el cliente dejó de contestar.
 *
 * Sin esto la bandeja se llena de chats que parecen vivos: alguien preguntó un
 * precio, no volvió a escribir, y el caso se queda "con el asistente" para
 * siempre. El asesor no distingue lo que sigue en curso de lo que murió hace
 * tres días, y el conteo de la pantalla deja de significar nada.
 *
 * El corte son 24 horas porque es la ventana de Meta: pasada esa hora ya no se
 * le puede escribir texto libre a esa persona, así que la conversación está
 * terminada tanto para el cliente como para el taller.
 *
 * Sólo se tocan las que sigue atendiendo el bot. Si un asesor la tomó, es suya
 * hasta que la cierre: llevar tres días sin respuesta puede ser justamente lo
 * que tiene pendiente.
 */
@Injectable()
export class WhatsappConversationExpiryJob {
  private readonly logger = new Logger(WhatsappConversationExpiryJob.name);

  private static readonly WINDOW_HOURS = 24;

  constructor(
    @InjectRepository(WhatsappConversation)
    private readonly conversationRepo: Repository<WhatsappConversation>,
  ) {}

  @Cron('15 * * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const limite = new Date(
      Date.now() - WhatsappConversationExpiryJob.WINDOW_HOURS * 60 * 60 * 1000,
    );

    const { affected } = await this.conversationRepo.update(
      {
        state: WhatsappConversationStateEnum.BOT,
        lastMessageAt: LessThan(limite),
      },
      { state: WhatsappConversationStateEnum.EXPIRED },
    );

    if (affected) {
      this.logger.log(`${affected} conversación(es) de WhatsApp expiradas`);
    }
  }
}
