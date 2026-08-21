import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SaasPayment, SaasPaymentStatusEnum } from './entities/saas.entities';

/**
 * En qué punto del bloqueo por falta de pago está un cliente del SaaS.
 *
 * No es lo mismo que la suspensión manual (`tenant.isActive`): esto se deriva
 * solo de los cobros vencidos y escala solo con el tiempo, sin que nadie tenga
 * que acordarse de apretar un botón.
 */
export enum BillingBlockState {
  /** Sin adeudo vencido: opera normal. */
  AL_CORRIENTE = 'AL_CORRIENTE',
  /** Vencido dentro del periodo de gracia: puede ver pero no capturar. */
  SOLO_LECTURA = 'SOLO_LECTURA',
  /** Pasado el periodo de gracia: acceso bloqueado salvo el portal de pago. */
  BLOQUEADO = 'BLOQUEADO',
}

export interface BillingStatus {
  estado: BillingBlockState;
  /** Días transcurridos desde el vencimiento más antiguo (0 si al corriente). */
  diasMora: number;
  /** Días que le quedan de solo-lectura antes del bloqueo total (0 = último). */
  diasParaBloqueo: number;
  /** Suma de los cobros vencidos. */
  adeudo: number;
  /** Periodos (AAAA-MM) con adeudo, del más viejo al más nuevo. */
  periodosVencidos: string[];
  /** Umbral de días de gracia (solo-lectura) configurado. */
  umbralSoloLectura: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Calcula el estado de bloqueo por impago de cada cliente.
 *
 * Se cachea unos segundos por tenant: el interceptor lo consulta en cada
 * request y no queremos una consulta a la base por cada llamada. La ventana es
 * corta a propósito —un pago recién registrado debe reflejarse pronto— y
 * `invalidar()` la limpia al instante cuando algo cambia (pago, webhook).
 */
@Injectable()
export class BillingStatusService {
  private readonly cache = new Map<string, { status: BillingStatus; expira: number }>();

  constructor(
    @InjectRepository(SaasPayment)
    private readonly pagoRepo: Repository<SaasPayment>,
    private readonly config: ConfigService,
  ) {}

  private get umbral(): number {
    const v = Number(this.config.get('SAAS_READONLY_DAYS'));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 10;
  }

  /** Limpia la cache de un cliente (tras registrar un pago o al confirmarlo). */
  invalidar(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  async estado(tenantId: string): Promise<BillingStatus> {
    const cacheado = this.cache.get(tenantId);
    if (cacheado && cacheado.expira > Date.now()) return cacheado.status;
    const status = await this.calcular(tenantId);
    this.cache.set(tenantId, { status, expira: Date.now() + CACHE_TTL_MS });
    return status;
  }

  /**
   * Fecha a partir de la cual un cobro cuenta como vencido. Normalmente su
   * fecha límite; si se marcó VENCIDO a mano sin fecha, la de captura, para no
   * dejar un adeudo sin punto de partida para contar los días.
   */
  private venceEl(p: SaasPayment): Date | null {
    if (p.dueDate) return new Date(`${p.dueDate}T23:59:59`);
    if (p.status === SaasPaymentStatusEnum.VENCIDO && p.createdAt) {
      return new Date(p.createdAt);
    }
    return null;
  }

  private async calcular(tenantId: string): Promise<BillingStatus> {
    const umbral = this.umbral;
    const base: BillingStatus = {
      estado: BillingBlockState.AL_CORRIENTE,
      diasMora: 0,
      diasParaBloqueo: umbral,
      adeudo: 0,
      periodosVencidos: [],
      umbralSoloLectura: umbral,
    };

    const candidatos = await this.pagoRepo.find({
      where: [
        { tenantId, status: SaasPaymentStatusEnum.PENDIENTE },
        { tenantId, status: SaasPaymentStatusEnum.VENCIDO },
      ],
      order: { period: 'ASC' },
    });

    const ahora = Date.now();
    const vencidos = candidatos.filter((p) => {
      const vence = this.venceEl(p);
      return !!vence && vence.getTime() < ahora;
    });
    if (vencidos.length === 0) return base;

    // El adeudo más antiguo manda el reloj: es el que decide cuántos días de
    // mora lleva el cliente y, por tanto, en qué escalón cae.
    const masViejo = vencidos.reduce((min, p) => {
      const v = this.venceEl(p)!.getTime();
      return v < min ? v : min;
    }, Infinity);
    const diasMora = Math.max(1, Math.floor((ahora - masViejo) / DIA_MS));

    const estado =
      diasMora > umbral
        ? BillingBlockState.BLOQUEADO
        : BillingBlockState.SOLO_LECTURA;

    return {
      estado,
      diasMora,
      diasParaBloqueo:
        estado === BillingBlockState.BLOQUEADO
          ? 0
          : Math.max(0, umbral - diasMora),
      adeudo: vencidos.reduce((a, p) => a + p.amount, 0),
      periodosVencidos: vencidos.map((p) => p.period),
      umbralSoloLectura: umbral,
    };
  }
}
