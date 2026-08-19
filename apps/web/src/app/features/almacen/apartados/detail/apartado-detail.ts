import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService } from "../../almacen.service";
import {
  UnitReservation,
  UnitReservationStatus,
} from "../../models/unit-reservation.model";

@Component({
  selector: "app-apartado-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./apartado-detail.html",
  styleUrls: ["./apartado-detail.scss"],
})
export class ApartadoDetail implements OnInit {
  private almacenService = inject(AlmacenService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  apartado = signal<UnitReservation | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  releasing = signal(false);
  releaseReason = signal("");

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/warehouse/apartados"]);
      return;
    }

    this.almacenService.getUnitReservation(id).subscribe({
      next: (r) => {
        this.apartado.set(r);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar apartado");
      },
    });
  }

  onRelease(): void {
    const a = this.apartado();
    if (!a || this.releasing()) return;
    if (a.status !== UnitReservationStatus.ACTIVE) return;

    const reason = this.releaseReason().trim();
    if (!reason) {
      this.toastr.warning("Indique el motivo de la liberación");
      return;
    }
    if (!confirm("¿Liberar este apartado? La unidad volverá a estar disponible.")) return;

    this.releasing.set(true);
    this.almacenService.releaseUnitReservation(a.id, reason).subscribe({
      next: (updated) => {
        this.apartado.set(updated);
        this.releaseReason.set("");
        this.toastr.success("Apartado liberado");
        this.releasing.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al liberar");
        this.releasing.set(false);
      },
    });
  }

  setReleaseReason(value: string): void {
    this.releaseReason.set(value);
  }

  canRelease(): boolean {
    const a = this.apartado();
    return !!a && a.status === UnitReservationStatus.ACTIVE;
  }

  getStatusLabel(status: string): string {
    return this.almacenService.getReservationStatusLabel(status);
  }

  getUnitLabel(r: UnitReservation): string {
    const cu = r.catalogUnit;
    if (cu) {
      return `${cu.year} ${cu.brand} ${cu.model}`.trim() || cu.serialNumber || r.catalogUnitId;
    }
    return r.catalogUnitId;
  }

  getClientName(r: UnitReservation): string {
    const c = r.client;
    if (c) {
      if (c.companyName) return c.companyName;
      const parts = [c.firstName, c.lastName].filter(Boolean);
      return parts.join(" ") || c.phone || r.clientId;
    }
    return r.clientId;
  }
}
