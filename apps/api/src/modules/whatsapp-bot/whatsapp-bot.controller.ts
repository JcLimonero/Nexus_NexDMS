import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  WhatsappBotService,
  type IncomingMessage,
} from './whatsapp-bot.service';
import { WhatsappRoutingService } from '../whatsapp-core/whatsapp-routing.service';
import { WhatsappSignatureGuard } from './whatsapp-signature.guard';

/**
 * Forma del webhook de Meta, acotada a lo que se usa.
 *
 * `metadata.phone_number_id` es la pieza clave: dice a qué número llegó el
 * mensaje y con eso se sabe de qué sucursal —y de qué tenant— es.
 */
interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{
          wa_id?: string;
          profile?: { name?: string };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

/**
 * Webhook de WhatsApp (Meta Cloud API) para el bot de citas.
 * GET: verificación del webhook. POST: mensajes entrantes.
 */
@ApiTags('WhatsApp Bot')
@Controller('whatsapp')
export class WhatsappBotController {
  private readonly logger = new Logger(WhatsappBotController.name);

  constructor(
    private readonly botService: WhatsappBotService,
    private readonly routing: WhatsappRoutingService,
  ) {}

  @Get('webhook')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? 'nexdms-verify';
    if (mode === 'subscribe' && token === expected) {
      return challenge ?? '';
    }
    throw new ForbiddenException('Token de verificación inválido');
  }

  @Post('webhook')
  @UseGuards(WhatsappSignatureGuard)
  @Throttle({ short: { limit: 60, ttl: 60000 } })
  async receive(@Body() payload: MetaWebhookPayload) {
    const replies: string[] = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const messages = value?.messages ?? [];
        if (messages.length === 0) continue;

        if (!phoneNumberId) {
          this.logger.warn('Webhook sin phone_number_id: no se puede enrutar');
          continue;
        }

        const route = await this.routing.resolve(phoneNumberId);
        if (!route) {
          // 200 de todos modos: un 4xx haría que Meta reintente en ciclo por
          // algo que no se arregla reintentando.
          continue;
        }

        for (const msg of messages) {
          if (!msg.from || !msg.id) continue;

          const profileName = value?.contacts?.find((c) => c.wa_id === msg.from)
            ?.profile?.name;

          const incoming: IncomingMessage = {
            waMessageId: msg.id,
            from: msg.from,
            type:
              msg.type === 'text'
                ? 'text'
                : msg.type === 'image'
                  ? 'image'
                  : 'unsupported',
            text: msg.text?.body ?? '',
            profileName,
          };

          const out = await this.botService.handleIncoming(route, incoming);
          replies.push(...out);
        }
      }
    }

    // Meta ignora el body; se regresa para pruebas locales.
    return { ok: true, replies };
  }
}
