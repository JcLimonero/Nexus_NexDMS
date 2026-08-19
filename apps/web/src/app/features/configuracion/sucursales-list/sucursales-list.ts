import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";

import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

interface BranchItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

@Component({
  selector: "app-sucursales-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./sucursales-list.html",
  styleUrls: ["./sucursales-list.scss"],
})
export class SucursalesList implements OnInit {
  private branchesService = inject(BranchesService);

  sucursales = signal<BranchItem[]>([]);
  meta = signal<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  searchFilter = signal<string>("");

  private loadSubject = new Subject<void>();

  ngOnInit(): void {
    this.loadSubject
      .pipe(
        debounceTime(100),
        switchMap(() =>
          this.branchesService.getAll(
            this.meta()?.page ?? 1,
            20,
            this.searchFilter().trim() || undefined
          )
        )
      )
      .subscribe({
        next: (res) => {
          this.sucursales.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar sucursales");
        },
      });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadSubject.next();
  }

  onFilterChange(): void {
    this.meta.update((m) => (m ? { ...m, page: 1 } : null));
    this.load();
  }

  goToPage(page: number): void {
    const m = this.meta();
    if (!m || page < 1 || page > m.totalPages) return;
    this.meta.update((prev) => (prev ? { ...prev, page } : null));
    this.load();
  }
}
