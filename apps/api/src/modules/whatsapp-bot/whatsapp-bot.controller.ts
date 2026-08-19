import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WhatsappBotService } from './whatsapp-bot.service';

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
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
  constructor(private readonly botService: WhatsappBotService) {}

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
  @Throttle({ short: { limit: 60, ttl: 60000 } })
  async receive(@Body() payload: MetaWebhookPayload) {
    const replies: string[] = [];
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          if (msg.type !== 'text' || !msg.from) continue;
          const out = await this.botService.handleIncoming(
            msg.from,
            msg.text?.body ?? '',
          );
          replies.push(...out);
        }
      }
    }
    // Meta ignora el body; se regresa para pruebas locales.
    return { ok: true, replies };
  }
}
