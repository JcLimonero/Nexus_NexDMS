import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { InventarioRefaccionesService } from "../../inventario-refacciones.service";
import { BranchesService } from "../../services/branches.service";
import { Part, PartVehicleType } from "../../models/part.model";
import { PartCategory } from "../../models/part-category.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";
import { Importador } from "../../../../shared/components/importador/importador";

@Component({
  selector: "app-partes-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons, Importador],
  templateUrl: "./partes-list.html",
  styleUrls: ["./partes-list.scss"],
})
export class PartesList implements OnInit {
  private inventarioService = inject(InventarioRefaccionesService);
  private branchesService = inject(BranchesService);

  partes = signal<Part[]>([]);
  categorias = signal<PartCategory[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchTerm = signal("");
  categoryFilter = signal<string>("");
  vehicleTypeFilter = signal<string>("");
  branchFilter = signal<string>("");

  private searchSubject = new Subject<void>();

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.inventarioService.getCategories({ limit: 200 }).subscribe({
      next: (res) => this.categorias.set(res.data),
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() =>
          this.inventarioService.getParts({
            search: this.searchTerm() || undefined,
            categoryId: this.categoryFilter() || undefined,
            vehicleType:
              this.vehicleTypeFilter() as PartVehicleType | undefined,
            branchId: this.branchFilter() || undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          this.partes.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar partes");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.searchSubject.next();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onCategoryFilterChange(value: string): void {
    this.categoryFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onVehicleTypeFilterChange(value: string): void {
    this.vehicleTypeFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  deleteParte(parte: Part, event: Event): void {
    event.preventDefault();
    if (!confirm(`¿Eliminar la parte "${parte.name}"?`)) return;
    this.inventarioService.deletePart(parte.id).subscribe({
      next: () => this.load(),
      error: (err) =>
        alert(err?.error?.message || "Error al eliminar la parte"),
    });
  }

  getVehicleTypeLabel(type: string): string {
    return this.inventarioService.getVehicleTypeLabel(type);
  }

  getCategoryName(id: string): string {
    return this.categorias().find((c) => c.id === id)?.name ?? "—";
  }
}
