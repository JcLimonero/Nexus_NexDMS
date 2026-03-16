import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../../../common/http/retry.util';

export interface SmsSendParams {
  to: string;
  body: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly sid: string | null;
  private readonly token: string | null;
  private readonly from: string | null;

  constructor(private readonly config: ConfigService) {
    this.sid = this.config.get<string>('TWILIO_SID') ?? null;
    this.token = this.config.get<string>('TWILIO_TOKEN') ?? null;
    this.from = this.config.get<string>('TWILIO_FROM') ?? null;
  }

  async send(
    params: SmsSendParams,
  ): Promise<{ success: boolean; sid?: string }> {
    if (!this.sid || !this.token || this.sid === 'CAMBIAR') {
      // Mock: sin credenciales, no fallar
      return { success: true, sid: 'mock-' + Date.now() };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`;
      const body = new URLSearchParams({
        To: params.to,
        From: this.from ?? '',
        Body: params.body,
      });

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString('base64')}`,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Twilio API error: ${err}`);
      }

      const data = (await response.json()) as { sid?: string };
      return { success: true, sid: data.sid };
    } catch (e) {
      this.logger.warn('send failed', e);
      throw e;
    }
  }
}
