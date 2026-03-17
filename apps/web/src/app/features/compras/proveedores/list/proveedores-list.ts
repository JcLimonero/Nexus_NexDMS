import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { ComprasService } from "../../compras.service";
import { Supplier } from "../../models/supplier.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-proveedores-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./proveedores-list.html",
  styleUrls: ["./proveedores-list.scss"],
})
export class ProveedoresList implements OnInit {
  private comprasService = inject(ComprasService);

  proveedores = signal<Supplier[]>([]);
  meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchTerm = signal("");
  activeFilter = signal<string>("");

  private searchSubject = new Subject<void>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() =>
          this.comprasService.getSuppliers({
            search: this.searchTerm() || undefined,
            isActive: this.activeFilter() === "true" ? true : this.activeFilter() === "false" ? false : undefined,
            page: this.meta()?.page ?? 1,
            limit: 20,
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          this.proveedores.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar proveedores");
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

  onActiveFilterChange(value: string): void {
    this.activeFilter.set(value);
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }

  onDelete(proveedor: Supplier): void {
    if (!confirm(`¿Eliminar a ${proveedor.name}?`)) return;
    this.comprasService.deleteSupplier(proveedor.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.error.set(err?.error?.message || "Error al eliminar");
      },
    });
  }
}
