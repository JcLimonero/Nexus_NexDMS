import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../../../common/http/retry.util';

export interface WhatsAppSendParams {
  to: string;
  templateKey: string;
  templateParams?: Record<string, string>;
}

/**
 * De qué número sale el mensaje.
 *
 * Cada sucursal tiene el suyo (`branch_config`); las de entorno quedan sólo
 * como respaldo para desarrollo y para los envíos que todavía no saben de qué
 * sucursal son.
 */
export interface WhatsAppCredentials {
  phoneNumberId: string;
  token: string;
}

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly envPhoneId: string | null;
  private readonly envToken: string | null;

  constructor(private readonly config: ConfigService) {
    this.envPhoneId = this.config.get<string>('WHATSAPP_PHONE_ID') ?? null;
    this.envToken = this.config.get<string>('WHATSAPP_TOKEN') ?? null;
  }

  /** Las de la sucursal si vienen; si no, las de entorno. */
  private resolve(creds?: WhatsAppCredentials): WhatsAppCredentials | null {
    if (creds?.phoneNumberId && creds.token) return creds;
    if (this.envPhoneId && this.envToken) {
      return { phoneNumberId: this.envPhoneId, token: this.envToken };
    }
    return null;
  }

  /**
   * Mensaje de texto libre (válido dentro de la ventana de 24 h de una
   * conversación iniciada por el cliente — el caso del bot de citas).
   */
  async sendText(
    to: string,
    body: string,
    creds?: WhatsAppCredentials,
  ): Promise<{ success: boolean; messageId?: string }> {
    const active = this.resolve(creds);
    if (!active) {
      // Mock: sin credenciales, no fallar
      this.logger.debug(`[mock] WhatsApp a ${to}: ${body.slice(0, 80)}`);
      return { success: true, messageId: 'mock-' + Date.now() };
    }
    try {
      const url = `https://graph.facebook.com/v18.0/${active.phoneNumberId}/messages`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.token}`,
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
    creds?: WhatsAppCredentials,
  ): Promise<{ success: boolean; messageId?: string }> {
    const active = this.resolve(creds);
    if (!active) {
      // Mock: sin credenciales, no fallar
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${active.phoneNumberId}/messages`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.token}`,
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
