import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  DocumentosVentaService,
  ETIQUETA_CLIENTE,
  ETIQUETA_VEHICULO,
  ETIQUETA_VENTA,
  Expediente,
  RequisitoResuelto,
} from "./documentos-venta.service";

/**
 * Expediente de documentos de una venta.
 *
 * Muestra qué papeles exige ESTA venta —según a quién, cómo y qué se vende— y
 * cuáles ya están. Se calcula en el servidor; aquí solo se pinta y se sube.
 *
 * Los de ámbito cliente (INE, domicilio) no se suben desde aquí: viven en el
 * expediente del cliente y se reutilizan. Se muestran para saber si faltan,
 * con una liga a la ficha del cliente, pero el botón de subir es solo para los
 * de la operación.
 */
@Component({
  selector: "app-expediente-venta",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./expediente-venta.html",
  styleUrls: ["./expediente-venta.scss"],
})
export class ExpedienteVenta {
  private srv = inject(DocumentosVentaService);
  private toastr = inject(ToastrService);

  unitSaleId = input.required<string>();
  clientId = input<string | null>(null);
  /** Roles que pueden revisar (aprobar/rechazar). */
  puedeRevisar = input<boolean>(false);

  cargando = signal(false);
  expediente = signal<Expediente | null>(null);
  /** Tipo cuyo archivo se está subiendo, para el indicador. */
  subiendo = signal<string | null>(null);
  /** Fila desplegada para capturar la fecha de vencimiento antes de subir. */
  fechaPara = signal<string | null>(null);
  fechaVencimiento = "";

  readonly etiquetaCliente = ETIQUETA_CLIENTE;
  readonly etiquetaVenta = ETIQUETA_VENTA;
  readonly etiquetaVehiculo = ETIQUETA_VEHICULO;

  obligatorios = computed(
    () => this.expediente()?.requisitos.filter((r) => r.required) ?? [],
  );
  opcionales = computed(
    () => this.expediente()?.requisitos.filter((r) => !r.required) ?? [],
  );

  constructor() {
    effect(() => {
      const id = this.unitSaleId();
      if (id) this.cargar(id);
    });
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.srv.expediente(id).subscribe({
      next: (e) => {
        this.expediente.set(e);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  recargar(): void {
    this.cargar(this.unitSaleId());
  }

  /** Semáforo de un requisito: verde cumplido, rojo falta, ámbar por revisar. */
  estado(r: RequisitoResuelto): "cumplido" | "revisar" | "rechazado" | "falta" {
    const c = r.cumplido;
    if (!c || c.vencido) return "falta";
    if (c.status === "REJECTED") return "rechazado";
    if (c.status === "PENDING") return "revisar";
    return "cumplido";
  }

  // ── Subir (solo ámbito venta) ──
  pedirArchivo(r: RequisitoResuelto, input: HTMLInputElement): void {
    if (r.hasExpiration) {
      // Con caducidad, primero la fecha: se despliega la fila y el archivo se
      // pide al confirmar.
      this.fechaPara.set(r.documentTypeId);
      this.fechaVencimiento = "";
    } else {
      input.click();
    }
  }

  confirmarFecha(input: HTMLInputElement): void {
    input.click();
  }

  onArchivo(ev: Event, r: RequisitoResuelto): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendo.set(r.documentTypeId);
    this.srv
      .subir(
        this.unitSaleId(),
        r.documentTypeId,
        file,
        r.hasExpiration ? this.fechaVencimiento || undefined : undefined,
      )
      .subscribe({
        next: () => {
          this.subiendo.set(null);
          this.fechaPara.set(null);
          this.toastr.success(`${r.name} cargado`);
          this.recargar();
        },
        error: (e) => {
          this.subiendo.set(null);
          this.toastr.error(e?.error?.message || "No se pudo subir");
        },
      });
    input.value = "";
  }

  descargar(r: RequisitoResuelto): void {
    if (!r.cumplido) return;
    this.srv.ligaDescarga(r.cumplido.id).subscribe({
      next: ({ url }) => window.open(url, "_blank", "noopener"),
      error: () => this.toastr.error("No se pudo abrir el documento"),
    });
  }

  aprobar(r: RequisitoResuelto): void {
    if (!r.cumplido) return;
    this.srv.revisar(r.cumplido.id, "APPROVED").subscribe({
      next: () => {
        this.toastr.success("Documento aprobado");
        this.recargar();
      },
    });
  }

  rechazar(r: RequisitoResuelto): void {
    if (!r.cumplido) return;
    const motivo = prompt(`Motivo del rechazo de "${r.name}":`);
    if (!motivo?.trim()) return;
    this.srv.revisar(r.cumplido.id, "REJECTED", motivo).subscribe({
      next: () => {
        this.toastr.info("Documento rechazado");
        this.recargar();
      },
    });
  }

  quitar(r: RequisitoResuelto): void {
    if (!r.cumplido || r.cumplido.origen !== "VENTA") return;
    this.srv.eliminarDocumento(r.cumplido.id).subscribe({
      next: () => this.recargar(),
    });
  }
}
