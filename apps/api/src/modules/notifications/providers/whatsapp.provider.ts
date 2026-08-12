import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../../../common/http/retry.util';

export interface WhatsAppSendParams {
  to: string;
  templateKey: string;
  templateParams?: Record<string, string>;
}

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly phoneId: string | null;
  private readonly token: string | null;

  constructor(private readonly config: ConfigService) {
    this.phoneId = this.config.get<string>('WHATSAPP_PHONE_ID') ?? null;
    this.token = this.config.get<string>('WHATSAPP_TOKEN') ?? null;
  }

  /**
   * Mensaje de texto libre (válido dentro de la ventana de 24 h de una
   * conversación iniciada por el cliente — el caso del bot de citas).
   */
  async sendText(
    to: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (!this.phoneId || !this.token) {
      // Mock: sin credenciales, no fallar
      this.logger.debug(`[mock] WhatsApp a ${to}: ${body.slice(0, 80)}`);
      return { success: true, messageId: 'mock-' + Date.now() };
    }
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'text',
          text: { body },
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`WhatsApp API error: ${err}`);
      }
      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
      };
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (e) {
      this.logger.error('Error enviando texto WhatsApp', e);
      return { success: false };
    }
  }

  async send(
    params: WhatsAppSendParams,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (!this.phoneId || !this.token) {
      // Mock: sin credenciales, no fallar
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: params.templateKey,
            language: { code: 'es' },
            components: params.templateParams
              ? [
                  {
                    type: 'body',
                    parameters: Object.values(params.templateParams).map(
                      (v) => ({
                        type: 'text',
                        text: v,
                      }),
                    ),
                  },
                ]
              : undefined,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`WhatsApp API error: ${err}`);
      }

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
      };
      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (e) {
      this.logger.warn('send failed', e);
      throw e;
    }
  }
}
