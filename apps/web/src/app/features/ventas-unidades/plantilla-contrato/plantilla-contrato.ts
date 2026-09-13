import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";
import { EditorHtml } from "../../../shared/components/editor-html/editor-html";

const KEY = "contract-unit-sale";

/**
 * Editor de la plantilla del contrato de compraventa. El negocio define su
 * propio texto (con formato); se guarda como HTML y el PDF del contrato lo usa
 * en vez de la plantilla ilustrativa. Reutiliza el editor `app-editor-html`.
 */
@Component({
  selector: "app-plantilla-contrato",
  standalone: true,
  imports: [CommonModule, FormsModule, EditorHtml],
  templateUrl: "./plantilla-contrato.html",
})
export class PlantillaContrato implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  html = "";
  cargando = signal(true);
  guardando = signal(false);

  /** True si hay texto propio (con contenido real, no solo etiquetas vacías). */
  get usandoPropia(): boolean {
    return !!this.html && this.html.replace(/<[^>]*>/g, "").trim().length > 0;
  }

  ngOnInit(): void {
    this.http
      .get<{ html: string }>(`/api/v1/document-templates/${KEY}`)
      .subscribe({
        next: (r) => {
          this.html = r.html ?? "";
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.toastr.error("No se pudo cargar la plantilla");
        },
      });
  }

  guardar(): void {
    this.guardando.set(true);
    this.http
      .put(`/api/v1/document-templates/${KEY}`, { html: this.html })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Plantilla guardada");
        },
        error: (e) => {
          this.guardando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo guardar");
        },
      });
  }

  limpiar(): void {
    if (confirm("¿Quitar tu plantilla y volver a la ilustrativa?")) {
      this.html = "";
      this.guardar();
    }
  }
}
