import { Component, Input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

/**
 * Botones de exportación de un listado.
 *
 * La descarga va por `fetch` en vez de un enlace directo porque el endpoint
 * exige el token: un `<a href>` no lo lleva. Se recibe el archivo como blob y
 * se dispara la descarga desde el navegador.
 */
@Component({
  selector: "app-exportar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="exportar">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [disabled]="bajando() !== null"
        (click)="descargar('excel')"
      >
        {{ bajando() === "excel" ? "Generando…" : "Excel" }}
      </button>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [disabled]="bajando() !== null"
        (click)="descargar('pdf')"
      >
        {{ bajando() === "pdf" ? "Generando…" : "PDF" }}
      </button>
    </div>
  `,
  styles: [
    `
      .exportar {
        display: inline-flex;
        gap: var(--space-8);
      }
    `,
  ],
})
export class Exportar {
  /** Clave del listado en el catálogo de exportación de la API. */
  @Input({ required: true }) dataset!: string;

  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  bajando = signal<"excel" | "pdf" | null>(null);

  descargar(formato: "excel" | "pdf"): void {
    if (this.bajando()) return;
    this.bajando.set(formato);
    this.http
      .get(`/api/v1/export/${this.dataset}/${formato}`, {
        responseType: "blob",
        observe: "response",
      })
      .subscribe({
        next: (res) => {
          this.bajando.set(null);
          const blob = res.body;
          if (!blob) return;
          // El nombre viene en la cabecera; si falta se arma uno razonable.
          const cd = res.headers.get("content-disposition") ?? "";
          const m = /filename="([^"]+)"/.exec(cd);
          const nombre =
            m?.[1] ??
            `${this.dataset}-${new Date().toISOString().slice(0, 10)}.${
              formato === "excel" ? "xlsx" : "pdf"
            }`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = nombre;
          a.click();
          // Sin esto el blob se queda en memoria mientras viva la pestaña.
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.bajando.set(null);
          this.toastr.error("No se pudo generar el archivo");
        },
      });
  }
}
