import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithRetry } from '../../common/http/retry.util';

const API_BASE = 'https://api.conekta.io';
const API_VERSION = 'application/vnd.conekta-v2.1.0+json';

export interface CheckoutInput {
  tenantId: string;
  /** Total a cobrar, en pesos. */
  monto: number;
  /** Periodos que cubre el pago (AAAA-MM), para conciliar en el webhook. */
  periodos: string[];
  cliente: { nombre: string; email: string; telefono?: string };
  successUrl: string;
  failureUrl: string;
}

export interface CheckoutSalida {
  url: string;
  referencia: string;
}

/** Resultado de confirmar una orden contra Conekta (no se confía en el webhook). */
export interface OrdenConfirmada {
  pagada: boolean;
  tenantId: string | null;
  periodos: string[];
  referencia: string;
}

/**
 * Cobro en línea del SaaS con Conekta (pasarela mexicana: tarjeta, SPEI, OXXO).
 *
 * La llave privada vive solo en variables de entorno del despliegue; el código
 * nunca la contiene. Si no está configurada, el checkout falla con un mensaje
 * claro y el cliente se queda con la vía de contacto/transferencia.
 *
 * El webhook no se cree a ciegas: cuando llega un evento se vuelve a consultar
 * la orden a Conekta y solo si esta responde "pagada" se marca el cobro, lo que
 * evita que un webhook falsificado reactive una cuenta sin haber pagado.
 */
@Injectable()
export class ConektaService {
  private readonly logger = new Logger(ConektaService.name);

  constructor(private readonly config: ConfigService) {}

  get habilitado(): boolean {
    return !!this.config.get<string>('CONEKTA_PRIVATE_KEY');
  }

  private headers(): Record<string, string> {
    const key = this.config.get<string>('CONEKTA_PRIVATE_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'El pago en línea no está configurado. Usa el contacto de Nexus para regularizarte.',
      );
    }
    const basic = Buffer.from(`${key}:`).toString('base64');
    return {
      Accept: API_VERSION,
      'Content-Type': 'application/json',
      Authorization: `Basic ${basic}`,
    };
  }

  /** Crea una orden con checkout hospedado y devuelve a dónde mandar a pagar. */
  async crearCheckout(input: CheckoutInput): Promise<CheckoutSalida> {
    const headers = this.headers();
    const centavos = Math.round(input.monto * 100);
    const periodos = input.periodos.join(',');
    const body = {
      currency: 'MXN',
      customer_info: {
        name: input.cliente.nombre || 'Cliente NexDMS',
        email: input.cliente.email,
        phone: input.cliente.telefono || undefined,
      },
      line_items: [
        {
          name: `Suscripción NexDMS${periodos ? ` (${periodos})` : ''}`,
          unit_price: centavos,
          quantity: 1,
        },
      ],
      checkout: {
        type: 'HostedPayment',
        allowed_payment_methods: ['card', 'cash', 'bank_transfer'],
        success_url: input.successUrl,
        failure_url: input.failureUrl,
      },
      metadata: { tenant_id: input.tenantId, periodos },
    };

    const res = await fetchWithRetry(`${API_BASE}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      maxRetries: 1,
    });
    const data = (await res.json()) as {
      id?: string;
      checkout?: { id?: string; url?: string };
      details?: { message?: string }[];
    };
    if (!res.ok) {
      const msg = data?.details?.[0]?.message || 'Conekta rechazó la orden';
      this.logger.error(`Conekta /orders ${res.status}: ${msg}`);
      throw new ServiceUnavailableException(
        'No se pudo iniciar el pago en línea. Intenta de nuevo o contacta a Nexus.',
      );
    }
    const checkoutId = data.checkout?.id;
    // La página hospedada expone la URL directamente; si la cuenta usa el
    // formato por id, se arma con la base configurable. La base exacta se
    // confirma con la cuenta Conekta al activar la pasarela.
    const base = this.config.get<string>(
      'CONEKTA_CHECKOUT_BASE',
      'https://pagos.conekta.com',
    );
    const url =
      data.checkout?.url || (checkoutId ? `${base}/${checkoutId}` : '');
    if (!url) {
      throw new ServiceUnavailableException(
        'Conekta no devolvió una liga de pago válida.',
      );
    }
    return { url, referencia: data.id || checkoutId || '' };
  }

  /** Re-consulta una orden y dice si de verdad está pagada y a quién cubre. */
  async confirmarOrden(orderId: string): Promise<OrdenConfirmada> {
    const res = await fetchWithRetry(`${API_BASE}/orders/${orderId}`, {
      method: 'GET',
      headers: this.headers(),
      maxRetries: 1,
    });
    const data = (await res.json()) as {
      id?: string;
      payment_status?: string;
      metadata?: { tenant_id?: string; periodos?: string };
    };
    if (!res.ok) {
      this.logger.warn(`Conekta GET /orders/${orderId} → ${res.status}`);
      return { pagada: false, tenantId: null, periodos: [], referencia: orderId };
    }
    return {
      pagada: data.payment_status === 'paid',
      tenantId: data.metadata?.tenant_id ?? null,
      periodos: (data.metadata?.periodos ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      referencia: data.id ?? orderId,
    };
  }
}
