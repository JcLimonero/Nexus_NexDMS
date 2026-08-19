import { BadRequestException } from '@nestjs/common';
import { fetchWithRetry } from '../../common/http/retry.util';

export interface FacturapiCustomer {
  legal_name: string;
  tax_id: string;
  tax_system: string;
  address: {
    zip: string;
    street?: string;
    exterior?: string;
    interior?: string;
    neighborhood?: string;
    city?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
  email?: string;
}

export interface FacturapiItem {
  product: {
    description: string;
    product_key: string;
    unit_key: string;
    unit_name: string;
    price: number;
    tax_included?: boolean;
    taxes?: Array<{
      type: string;
      rate: number;
      factor: string;
    }>;
  };
  quantity: number;
  discount?: number;
}

export interface FacturapiRelatedDocuments {
  /** Relación SAT: '01' nota de crédito, '04' sustitución, etc. */
  relationship: string;
  documents: string[];
}

export interface FacturapiGlobal {
  periodicity: string;
  months: string;
  year: number;
}

export interface FacturapiInvoicePayload {
  customer: FacturapiCustomer | string;
  items: FacturapiItem[];
  use: string;
  payment_form: string;
  payment_method: string;
  series?: string;
  /** 'I' ingreso (por defecto), 'E' egreso (nota de crédito). */
  type?: 'I' | 'E';
  /** Presente en una nota de crédito para ligar el CFDI de ingreso original. */
  related_documents?: FacturapiRelatedDocuments[];
  /** Presente en una factura global de público en general. */
  global?: FacturapiGlobal;
}

export interface FacturapiInvoiceResponse {
  id: string;
  uuid?: string;
  livemode?: boolean;
  status?: string;
  pdf?: string;
  xml?: string;
}

export interface FacturapiPaymentComplementPayload {
  type: 'P';
  customer: FacturapiCustomer;
  complements: Array<{
    type: 'pago';
    data: Array<{
      payment_form: string;
      payment_method?: string;
      related_documents: Array<{
        uuid: string;
        amount: number;
        installment: number;
        last_balance: number;
        taxes: Array<{ base: number; type: string; rate: number }>;
      }>;
    }>;
  }>;
}

export class CfdiFacturapiClient {
  private readonly baseUrl = 'https://api.facturapi.io/v2';

  constructor(private readonly apiKey: string) {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'CAMBIAR') {
      throw new BadRequestException(
        'Credenciales de FacturAPI no configuradas. Configure facturaapi_api_key en la sucursal.',
      );
    }
  }

  async createInvoice(
    payload: FacturapiInvoicePayload,
  ): Promise<FacturapiInvoiceResponse> {
    const response = await fetchWithRetry(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let message = `FacturAPI error: ${response.status}`;
      try {
        const parsed = JSON.parse(errBody) as { message?: string };
        message = parsed.message ?? message;
      } catch {
        message = errBody || message;
      }
      throw new BadRequestException(message);
    }

    return response.json() as Promise<FacturapiInvoiceResponse>;
  }

  async getInvoice(
    id: string,
  ): Promise<FacturapiInvoiceResponse & { pdf?: string; xml?: string }> {
    const response = await fetchWithRetry(`${this.baseUrl}/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new BadRequestException(
        `FacturAPI error: ${response.status} - ${errBody}`,
      );
    }

    return response.json() as Promise<
      FacturapiInvoiceResponse & { pdf?: string; xml?: string }
    >;
  }

  async downloadXml(invoiceId: string): Promise<Buffer> {
    const response = await fetchWithRetry(
      `${this.baseUrl}/invoices/${invoiceId}/xml`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `No se pudo descargar el XML: ${response.status}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async downloadPdf(invoiceId: string): Promise<Buffer> {
    const response = await fetchWithRetry(
      `${this.baseUrl}/invoices/${invoiceId}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `No se pudo descargar el PDF: ${response.status}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async createPaymentComplement(
    payload: FacturapiPaymentComplementPayload,
  ): Promise<FacturapiInvoiceResponse> {
    const response = await fetchWithRetry(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let message = `FacturAPI error (complemento pago): ${response.status}`;
      try {
        const parsed = JSON.parse(errBody) as { message?: string };
        message = parsed.message ?? message;
      } catch {
        message = errBody || message;
      }
      throw new BadRequestException(message);
    }

    return response.json() as Promise<FacturapiInvoiceResponse>;
  }

  async cancel(
    invoiceId: string,
    motive: string,
    substitutionUuid?: string,
  ): Promise<void> {
    const url = new URL(`${this.baseUrl}/invoices/${invoiceId}`);
    if (motive) url.searchParams.set('motive', motive);
    if (substitutionUuid)
      url.searchParams.set('substitution_uuid', substitutionUuid);

    const response = await fetchWithRetry(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new BadRequestException(
        `Error al cancelar factura: ${response.status} - ${errBody}`,
      );
    }
  }
}
