import { Component, EventEmitter, Input, Output, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface ResultadoImport {
  total: number;
  insertados: number;
  errores: { fila: number; mensaje: string }[];
}

/**
 * Botones de "Descargar plantilla" e "Importar" para un catálogo.
 *
 * Reutilizable: se le pasa la `entidad` (parts, clients, …) y trabaja contra
 * `/api/v1/imports/:entidad`. La descarga va como blob porque el token no
 * viaja en un `<a href>`. Emite `importado` para que la lista se recargue.
 */
@Component({
  selector: "app-importador",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="importador d-inline-flex align-items-center gap-2">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        (click)="descargar()"
        [disabled]="ocupado()"
        title="Descargar el formato de Excel para llenar"
      >
        <i class="icofont icofont-download me-1"></i> Plantilla
      </button>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        (click)="picker.click()"
        [disabled]="ocupado()"
        title="Cargar el Excel lleno"
      >
        <i class="icofont icofont-upload me-1"></i> Importar
      </button>
      <input
        #picker
        type="file"
        accept=".xlsx"
        hidden
        (change)="importar($event)"
      />
    </div>
  `,
})
export class Importador {
  /** Clave del catálogo (parts, clients, part-categories, …). */
  @Input({ required: true }) entidad!: string;
  /** Se emite tras una carga con al menos un registro insertado. */
  @Output() importado = new EventEmitter<void>();

  private http = inject(HttpClient);
  private toastr = inject(ToastrService);
  ocupado = signal(false);

  descargar(): void {
    this.ocupado.set(true);
    this.http
      .get(`/api/v1/imports/${this.entidad}/template`, {
        responseType: "blob",
        observe: "response",
      })
      .subscribe({
        next: (res) => {
          this.ocupado.set(false);
          const blob = res.body;
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `plantilla-${this.entidad}.xlsx`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
        },
        error: () => {
          this.ocupado.set(false);
          this.toastr.error("No se pudo descargar la plantilla");
        },
      });
  }

  importar(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    this.ocupado.set(true);
    this.http
      .post<ResultadoImport>(`/api/v1/imports/${this.entidad}`, form)
      .subscribe({
        next: (r) => {
          this.ocupado.set(false);
          input.value = ""; // permite recargar el mismo archivo
          if (r.insertados > 0) {
            this.toastr.success(`${r.insertados} registro(s) cargado(s)`);
            this.importado.emit();
          }
          if (r.errores.length) {
            const muestra = r.errores
              .slice(0, 5)
              .map((e) => `Fila ${e.fila}: ${e.mensaje}`)
              .join("\n");
            const extra =
              r.errores.length > 5 ? `\n…y ${r.errores.length - 5} más` : "";
            this.toastr.warning(muestra + extra, `${r.errores.length} fila(s) con error`, {
              timeOut: 12000,
              enableHtml: false,
            });
          }
          if (r.insertados === 0 && r.errores.length === 0) {
            this.toastr.info("No se cargó ningún registro");
          }
        },
        error: (err) => {
          this.ocupado.set(false);
          input.value = "";
          this.toastr.error(err?.error?.message || "No se pudo importar el archivo");
        },
      });
  }
}
