import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../http/retry.util';

const API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

export interface EnvioCorreo {
  /** Asunto → variable {{subject}} de la plantilla. */
  subject: string;
  /** Cuerpo HTML → variable {{{html_message}}} de la plantilla. */
  html: string;
  /** Destinatario → variable {{to_email}} (o el "To" fijo de la plantilla). */
  to?: string;
  /** Variables extra para la plantilla, si se necesitan. */
  extra?: Record<string, string>;
}

/**
 * Envío de correo vía EmailJS (Outlook de Nexus conectado). Evita montar un
 * SMTP propio: se llama a su API REST con el service/template y las llaves del
 * despliegue.
 *
 * Las llaves viven solo en variables de entorno; si faltan, no se envía y se
 * deja aviso en el log (no rompe el flujo que lo invoca).
 */
@Injectable()
export class EmailjsService {
  private readonly logger = new Logger(EmailjsService.name);

  constructor(private readonly config: ConfigService) {}

  get habilitado(): boolean {
    return (
      !!this.config.get<string>('EMAILJS_PUBLIC_KEY') &&
      !!this.config.get<string>('EMAILJS_PRIVATE_KEY')
    );
  }

  /** Correo por defecto al que se dirigen los avisos internos de Nexus. */
  get destinoPorDefecto(): string {
    return (
      this.config.get<string>('NEXUS_ALERT_EMAIL') ||
      'carlos.limon@nexusqtech.com'
    );
  }

  async enviar(msg: EnvioCorreo): Promise<boolean> {
    const publicKey = this.config.get<string>('EMAILJS_PUBLIC_KEY');
    const privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY');
    if (!publicKey || !privateKey) {
      this.logger.warn(
        'EmailJS sin configurar (EMAILJS_PUBLIC_KEY/PRIVATE_KEY); no se envió el correo.',
      );
      return false;
    }
    const body = {
      service_id: this.config.get<string>(
        'EMAILJS_SERVICE_ID',
        'service_avrjmx6',
      ),
      template_id: this.config.get<string>(
        'EMAILJS_TEMPLATE_ID',
        'template_dbuf2q9',
      ),
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        subject: msg.subject,
        html_message: msg.html,
        to_email: msg.to || this.destinoPorDefecto,
        ...(msg.extra ?? {}),
      },
    };
    try {
      const res = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        maxRetries: 2,
      });
      if (!res.ok) {
        const txt = await res.text();
        this.logger.error(`EmailJS ${res.status}: ${txt.slice(0, 200)}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error('EmailJS falló al enviar', e as Error);
      return false;
    }
  }
}
