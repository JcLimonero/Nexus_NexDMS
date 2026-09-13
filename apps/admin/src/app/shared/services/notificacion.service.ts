import { Injectable, signal } from "@angular/core";

export type TonoToast = "ok" | "error" | "info";
export interface Toast {
  id: number;
  texto: string;
  tono: TonoToast;
}

/**
 * Avisos efímeros (toasts) del admin. Mecanismo único para toda la app: los
 * componentes y el interceptor de errores publican aquí y el host en la raíz
 * los pinta. Sin dependencias externas.
 */
@Injectable({ providedIn: "root" })
export class NotificacionService {
  private secuencia = 0;
  readonly toasts = signal<Toast[]>([]);

  ok(texto: string): void {
    this.push(texto, "ok");
  }
  error(texto: string): void {
    this.push(texto, "error", 6000);
  }
  info(texto: string): void {
    this.push(texto, "info");
  }

  cerrar(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(texto: string, tono: TonoToast, ms = 4000): void {
    const id = ++this.secuencia;
    this.toasts.update((list) => [...list, { id, texto, tono }]);
    setTimeout(() => this.cerrar(id), ms);
  }
}
