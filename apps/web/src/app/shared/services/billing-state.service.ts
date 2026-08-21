import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

export type BillingEstado = "AL_CORRIENTE" | "SOLO_LECTURA" | "BLOQUEADO";

export interface EstadoCobro {
  estado: BillingEstado;
  diasMora: number;
  diasParaBloqueo: number;
  adeudo: number;
  periodosVencidos: string[];
  umbralSoloLectura: number;
  cobroMensual?: number;
  moneda?: string;
  contacto?: {
    nombre: string;
    email: string;
    telefono: string;
    whatsapp: string;
  };
}

/**
 * Estado de cobro del SaaS del propio cliente, compartido por toda la app.
 *
 * El banner de solo-lectura y el portal de pago leen de aquí; el interceptor
 * lo alimenta cuando una petición choca con el bloqueo, y `refrescar()` lo
 * consulta al entrar para que el aviso aparezca sin esperar a un error.
 */
@Injectable({ providedIn: "root" })
export class BillingStateService {
  private http = inject(HttpClient);

  readonly estado = signal<EstadoCobro | null>(null);

  readonly enSoloLectura = computed(
    () => this.estado()?.estado === "SOLO_LECTURA",
  );
  readonly bloqueado = computed(() => this.estado()?.estado === "BLOQUEADO");

  /** Consulta el estado real; se llama al iniciar sesión y al abrir el portal. */
  refrescar(): void {
    this.http.get<EstadoCobro>("/api/v1/mi-cobro/estado").subscribe({
      next: (e) => this.estado.set(e),
      error: () => {},
    });
  }

  /** Alimenta el estado desde el cuerpo de un 403 de bloqueo. */
  marcarDesdeError(payload: Partial<EstadoCobro> | undefined): void {
    if (!payload?.estado) return;
    const previo = this.estado();
    this.estado.set({
      estado: payload.estado,
      diasMora: payload.diasMora ?? previo?.diasMora ?? 0,
      diasParaBloqueo: payload.diasParaBloqueo ?? previo?.diasParaBloqueo ?? 0,
      adeudo: payload.adeudo ?? previo?.adeudo ?? 0,
      periodosVencidos:
        payload.periodosVencidos ?? previo?.periodosVencidos ?? [],
      umbralSoloLectura:
        payload.umbralSoloLectura ?? previo?.umbralSoloLectura ?? 10,
      cobroMensual: payload.cobroMensual ?? previo?.cobroMensual,
      moneda: payload.moneda ?? previo?.moneda ?? "MXN",
      contacto: payload.contacto ?? previo?.contacto,
    });
  }

  limpiar(): void {
    this.estado.set(null);
  }
}
