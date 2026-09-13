import { Injectable, signal } from "@angular/core";

export interface OpcionesConfirm {
  titulo: string;
  mensaje?: string;
  confirmar?: string;
  cancelar?: string;
  /** Acción destructiva: el botón de confirmar se pinta en rojo. */
  peligro?: boolean;
}

interface EstadoConfirm extends OpcionesConfirm {
  resolver: (ok: boolean) => void;
}

/**
 * Confirmaciones con diálogo propio (en vez de `confirm()` nativo). El host
 * vive en la raíz; `pedir()` devuelve una promesa que resuelve true/false.
 */
@Injectable({ providedIn: "root" })
export class ConfirmService {
  readonly estado = signal<EstadoConfirm | null>(null);

  pedir(opciones: OpcionesConfirm): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.estado.set({ ...opciones, resolver: resolve });
    });
  }

  responder(ok: boolean): void {
    const e = this.estado();
    if (!e) return;
    this.estado.set(null);
    e.resolver(ok);
  }
}
