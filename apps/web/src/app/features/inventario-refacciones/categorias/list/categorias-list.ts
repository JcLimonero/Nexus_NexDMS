import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { InventarioRefaccionesService } from "../../inventario-refacciones.service";
import { PartCategory } from "../../models/part-category.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";
import { Importador } from "../../../../shared/components/importador/importador";

@Component({
  selector: "app-categorias-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons, Importador],
  templateUrl: "./categorias-list.html",
  styleUrls: ["./categorias-list.scss"],
})
export class CategoriasList implements OnInit {
  private inventarioService = inject(InventarioRefaccionesService);

  categorias = signal<PartCategory[]>([]);
  meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchFilter = signal<string>("");

  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.loadSubject
      .pipe(
        debounceTime(100),
        switchMap(() =>
          this.inventarioService.getCategories({
            search: this.searchFilter().trim() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          this.categorias.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar categorías");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onSearch(value: string): void {
    this.searchFilter.set(value);
    // Al cambiar la búsqueda regresamos a la primera página.
    this.meta.update((prev) => (prev ? { ...prev, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }
}
