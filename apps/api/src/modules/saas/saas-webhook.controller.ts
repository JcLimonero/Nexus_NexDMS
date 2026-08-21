import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SaasService } from './saas.service';

interface ConektaEvent {
  type?: string;
  data?: {
    object?: { id?: string; order_id?: string };
  };
}

/**
 * Webhook de la pasarela de pago del SaaS. Es público a propósito —lo llama
 * Conekta, no un usuario— y por eso no confía en el cuerpo: toma el id de la
 * orden y deja que el servicio la re-consulte para saber si de verdad se pagó.
 *
 * Siempre responde 200: si algo no cuadra se ignora en silencio, para que
 * Conekta no reintente en bucle por un evento que no nos interesa.
 */
@ApiTags('Cobro SaaS (webhook)')
@Controller('saas/webhook')
export class SaasWebhookController {
  constructor(private readonly saas: SaasService) {}

  @Post('conekta')
  async conekta(@Body() evento: ConektaEvent): Promise<{ ok: true }> {
    const obj = evento?.data?.object;
    const orderId = obj?.order_id || obj?.id;
    if (orderId) {
      try {
        await this.saas.confirmarPagoConekta(orderId);
      } catch {
        // Un fallo al confirmar no debe hacer que Conekta reintente sin fin.
      }
    }
    return { ok: true };
  }
}
