import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Importador } from "../../shared/components/importador/importador";

interface CatalogoImportable {
  key: string;
  label: string;
  columnas: {
    header: string;
    required: boolean;
    opciones?: string[];
    nota?: string;
  }[];
}

/**
 * Importación de catálogos por Excel, en un solo lugar.
 *
 * Lista los catálogos que el backend declara como importables y ofrece, por
 * cada uno, descargar su plantilla y cargarla. Complementa los botones que ya
 * viven en cada módulo, y da cabida a los catálogos sin pantalla propia.
 */
@Component({
  selector: "app-importaciones",
  standalone: true,
  imports: [CommonModule, Importador],
  templateUrl: "./importaciones.html",
})
export class Importaciones implements OnInit {
  private http = inject(HttpClient);
  catalogos = signal<CatalogoImportable[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<CatalogoImportable[]>("/api/v1/imports").subscribe({
      next: (c) => {
        this.catalogos.set(c);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(e?.error?.message || "No se pudieron cargar los catálogos");
      },
    });
  }

  obligatorias(c: CatalogoImportable): string {
    return c.columnas
      .filter((x) => x.required)
      .map((x) => x.header)
      .join(", ");
  }
}
