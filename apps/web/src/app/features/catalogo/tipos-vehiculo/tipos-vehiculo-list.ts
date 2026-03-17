import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { VehicleTypesService } from "../vehicle-types.service";
import { VehicleType } from "../models/modelo-global.model";

@Component({
  selector: "app-tipos-vehiculo-list",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./tipos-vehiculo-list.html",
})
export class TiposVehiculoList implements OnInit {
  private vehicleTypesService = inject(VehicleTypesService);
  private toastr = inject(ToastrService);

  types = signal<VehicleType[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  deleteType(type: VehicleType): void {
    if (!confirm(`¿Eliminar el tipo "${type.label}"?`)) return;
    this.vehicleTypesService.delete(type.id).subscribe({
      next: () => {
        this.toastr.success("Tipo eliminado");
        this.load();
      },
      error: (err) => {
        this.toastr.error(
          err?.error?.message || "Error al eliminar. Puede que tenga modelos asociados.",
        );
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.vehicleTypesService.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar tipos de vehículo");
      },
    });
  }
}
