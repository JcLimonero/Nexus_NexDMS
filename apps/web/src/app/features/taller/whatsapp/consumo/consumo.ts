import { Component, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * Consumo y facturación de WhatsApp (prototipo, datos demo).
 *
 * Modelo acordado:
 *  - Mensajes: tarifa plana por mensaje enviado.
 *  - Conversaciones del agente: por sesión de 24 h (una conversación = ventana
 *    de 24 h por cliente).
 *
 * En producción esto se alimenta de un ledger de uso (un registro por envío y
 * por sesión). Las tarifas se guardarían por tenant; aquí son constantes.
 */

interface LineaMensaje {
  tipo: string;
  /** Categoría de Meta, informativa (define si Meta lo cobra). */
  categoria: "Marketing" | "Utility" | "Service";
  cantidad: number;
}

/** Tarifas (MXN). Configurables por tenant en producción. */
const RATE_MSG = 1.2;
const RATE_CONV = 8.0;

@Component({
  selector: "app-consumo",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./consumo.html",
  styleUrls: ["./consumo.scss"],
})
export class Consumo {
  readonly rateMsg = RATE_MSG;
  readonly rateConv = RATE_CONV;

  readonly mensajes = signal<LineaMensaje[]>([
    { tipo: "Servicio pendiente", categoria: "Marketing", cantidad: 312 },
    { tipo: "Recordatorio de cita", categoria: "Utility", cantidad: 548 },
    { tipo: "Confirmación", categoria: "Utility", cantidad: 206 },
  ]);
  readonly conversaciones = signal<number>(134);

  readonly periodo = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  readonly totalMensajes = computed(() =>
    this.mensajes().reduce((a, l) => a + l.cantidad, 0),
  );
  readonly costoMensajes = computed(() => this.totalMensajes() * this.rateMsg);
  readonly costoConversaciones = computed(
    () => this.conversaciones() * this.rateConv,
  );
  readonly total = computed(
    () => this.costoMensajes() + this.costoConversaciones(),
  );

  subtotal(l: LineaMensaje): number {
    return l.cantidad * this.rateMsg;
  }
  catClass(c: LineaMensaje["categoria"]): string {
    return c === "Marketing" ? "p-warn" : c === "Utility" ? "p-sent" : "p-ok";
  }
}
