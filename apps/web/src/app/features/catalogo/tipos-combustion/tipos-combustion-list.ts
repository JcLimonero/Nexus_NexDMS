import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CombustionTypesService } from "../combustion-types.service";
import { CombustionType } from "../models/modelo-global.model";

@Component({
  selector: "app-tipos-combustion-list",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./tipos-combustion-list.html",
})
export class TiposCombustionList implements OnInit {
  private combustionTypesService = inject(CombustionTypesService);
  private toastr = inject(ToastrService);

  types = signal<CombustionType[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  deleteType(type: CombustionType): void {
    if (!confirm(`¿Eliminar el tipo "${type.label}"?`)) return;
    this.combustionTypesService.delete(type.id).subscribe({
      next: () => {
        this.toastr.success("Tipo eliminado");
        this.load();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al eliminar");
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.combustionTypesService.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar tipos de combustión");
      },
    });
  }
}
