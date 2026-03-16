import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../../../common/http/retry.util';

export interface EmailSendParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') ?? null;
  }

  async send(
    params: EmailSendParams,
  ): Promise<{ success: boolean; id?: string }> {
    if (!this.apiKey || this.apiKey === 'CAMBIAR') {
      // Mock: sin credenciales, no fallar
      return { success: true, id: 'mock-' + Date.now() };
    }

    try {
      const url = 'https://api.resend.com/emails';
      const body: Record<string, unknown> = {
        from:
          this.config.get<string>('OPS_EMAIL') ?? 'notifications@nexdms.com',
        to: params.to,
        subject: params.subject,
        html: params.html ?? params.text,
      };

      if (params.attachments?.length) {
        body.attachments = params.attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        }));
      }

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Resend API error: ${err}`);
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, id: data.id };
    } catch (e) {
      this.logger.warn('send failed', e);
      throw e;
    }
  }
}
