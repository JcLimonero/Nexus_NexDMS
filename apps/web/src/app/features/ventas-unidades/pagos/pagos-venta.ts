import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

import {
  ETIQUETA_FORMA,
  ETIQUETA_TIPO,
  FORMA_PAGO,
  PagoVenta,
  PagosResumen,
  PagosVentaService,
  RegistrarPago,
  TIPO_PAGO,
} from "./pagos-venta.service";

/**
 * Pagos de una venta de unidad.
 *
 * Registra los movimientos —apartado, enganche, parciales, liquidación— con su
 * forma de pago, y adjunta el comprobante de cada uno. El comprobante puede
 * subirse después: se registra el pago cuando entra el dinero y el recibo
 * cuando se tiene a la mano. La venta no se cierra hasta que todos lo tengan;
 * este panel lo avisa arriba.
 */
@Component({
  selector: "app-pagos-venta",
  standalone: true,
  imports: [MoneyPipe, CommonModule, FormsModule],
  templateUrl: "./pagos-venta.html",
  styleUrls: ["./pagos-venta.scss"],
})
export class PagosVenta {
  private srv = inject(PagosVentaService);
  private toastr = inject(ToastrService);
  private http = inject(HttpClient);

  /** Abre el recibo del pago en PDF (blob, para que lleve la credencial). */
  verRecibo(p: PagoVenta): void {
    this.http
      .get(`/api/v1/unit-sales/payments/${p.id}/recibo`, {
        responseType: "blob",
      })
      .subscribe({
        next: (pdf) => {
          const url = URL.createObjectURL(pdf);
          window.open(url, "_blank", "noopener");
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: () => this.toastr.error("No se pudo generar el recibo"),
      });
  }

  /** Envía el recibo por correo (PDF adjunto). Vacío usa el correo del cliente. */
  enviarRecibo(p: PagoVenta): void {
    const email = window.prompt(
      "Enviar el recibo por correo a (vacío = correo del cliente):",
      "",
    );
    if (email === null) return;
    const body = email.trim() ? { email: email.trim() } : {};
    this.toastr.info("Enviando…");
    this.http
      .post(`/api/v1/unit-sales/payments/${p.id}/recibo/email`, body)
      .subscribe({
        next: () => this.toastr.success("Recibo enviado por correo"),
        error: (e) =>
          this.toastr.error(e?.error?.message || "No se pudo enviar el correo"),
      });
  }

  unitSaleId = input.required<string>();
  /** Solo en una venta en proceso se registran o borran pagos. */
  editable = input<boolean>(true);

  readonly tipos = TIPO_PAGO;
  readonly formas = FORMA_PAGO;
  readonly etiquetaTipo = ETIQUETA_TIPO;
  readonly etiquetaForma = ETIQUETA_FORMA;

  cargando = signal(false);
  resumen = signal<PagosResumen | null>(null);
  guardando = signal(false);
  subiendo = signal<string | null>(null);
  altaAbierta = signal(false);

  form: RegistrarPago = this.vacio();

  faltanComprobantes = computed(
    () => (this.resumen()?.pagosSinComprobante ?? 0) > 0,
  );

  constructor() {
    effect(() => {
      const id = this.unitSaleId();
      if (id) this.cargar(id);
    });
  }

  private vacio(): RegistrarPago {
    return {
      kind: "ENGANCHE",
      amount: 0,
      method: "TRANSFER",
      reference: "",
      paidDate: new Date().toISOString().slice(0, 10),
      notes: "",
    };
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.srv.listar(id).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  recargar(): void {
    this.cargar(this.unitSaleId());
  }

  abrirAlta(): void {
    this.form = this.vacio();
    this.altaAbierta.set(true);
  }

  registrar(): void {
    if (!this.form.amount || this.form.amount <= 0) {
      this.toastr.warning("El importe debe ser mayor a cero");
      return;
    }
    this.guardando.set(true);
    this.srv.registrar(this.unitSaleId(), this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.altaAbierta.set(false);
        this.toastr.success("Pago registrado");
        this.recargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo registrar");
      },
    });
  }

  onComprobante(ev: Event, pago: PagoVenta): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendo.set(pago.id);
    this.srv.subirComprobante(pago.id, file).subscribe({
      next: () => {
        this.subiendo.set(null);
        this.toastr.success("Comprobante adjuntado");
        this.recargar();
      },
      error: (e) => {
        this.subiendo.set(null);
        this.toastr.error(e?.error?.message || "No se pudo subir");
      },
    });
    input.value = "";
  }

  verComprobante(pago: PagoVenta): void {
    this.srv.ligaComprobante(pago.id).subscribe({
      next: ({ url }) => window.open(url, "_blank", "noopener"),
      error: () => this.toastr.error("No se pudo abrir el comprobante"),
    });
  }

  eliminar(pago: PagoVenta): void {
    if (!confirm(`¿Borrar el pago de ${this.etiquetaTipo[pago.kind]}?`)) return;
    this.srv.eliminar(pago.id).subscribe({
      next: () => this.recargar(),
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo borrar"),
    });
  }
}
