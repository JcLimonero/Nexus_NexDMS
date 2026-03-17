import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { ExpedienteStatus } from "../../models/catalog-unit.model";
import {
  CatalogUnit,
  CatalogUnitStatus,
  UnitHistoryEvent,
} from "../../models/catalog-unit.model";
import { UNIT_RETURN_DOCUMENT_TYPE_LABELS } from "../../models/unit-return-document.model";

@Component({
  selector: "app-unidad-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./unidad-detail.html",
  styleUrls: ["./unidad-detail.scss"],
})
export class UnidadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioUnidadesService);
  private toastr = inject(ToastrService);

  unidad = signal<CatalogUnit | null>(null);
  history = signal<UnitHistoryEvent[]>([]);
  expedienteStatus = signal<ExpedienteStatus | null>(null);
  loading = signal(true);

  /** Expone expedienteStatus para el template (evita TS2339 en control flow anidado) */
  getExpedienteStatus(): ExpedienteStatus | null {
    return this.expedienteStatus();
  }
  completing = signal(false);
  error = signal<string | null>(null);

  readonly docLabels = UNIT_RETURN_DOCUMENT_TYPE_LABELS;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/inventario-unidades"]);
      return;
    }

    this.inventarioService.getUnit(id).subscribe({
      next: (u) => {
        this.unidad.set(u);
        this.loading.set(false);
        this.error.set(null);
        this.loadHistory(id);
        this.loadExpedienteStatus(id);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar unidad");
      },
    });
  }

  private loadHistory(id: string): void {
    this.inventarioService.getUnitHistory(id).subscribe({
      next: (events) => this.history.set(events),
      error: () => this.history.set([]),
    });
  }

  private loadExpedienteStatus(id: string): void {
    this.inventarioService.getExpedienteStatus(id).subscribe({
      next: (s) => this.expedienteStatus.set(s),
      error: () => this.expedienteStatus.set(null),
    });
  }

  onCompleteExpediente(): void {
    const u = this.unidad();
    if (!u || this.completing()) return;

    this.completing.set(true);
    this.inventarioService.completeExpediente(u.id).subscribe({
      next: (updated) => {
        this.unidad.set(updated);
        this.expedienteStatus.set({
          ...this.expedienteStatus()!,
          complete: true,
          canBecomeAvailable: false,
        });
        this.toastr.success("Expediente completado. La unidad ya está disponible.");
        this.completing.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al completar expediente");
        this.completing.set(false);
      },
    });
  }

  getDocLabel(code: string): string {
    return this.docLabels[code as keyof typeof this.docLabels] ?? code;
  }

  getMissingDocsLabel(missing: string[]): string {
    return missing.map((d) => this.getDocLabel(d)).join(", ");
  }

  getVehicleTypeLabel(type: string): string {
    return this.inventarioService.getVehicleTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.inventarioService.getStatusLabel(status as CatalogUnitStatus);
  }

  getDisplayLabel(u: CatalogUnit): string {
    const v = u.version ? ` ${u.version}` : "";
    return `${u.brand} ${u.model}${v} (${u.year}) - ${u.color}`;
  }

  getConditionLabel(condition: string): string {
    return this.inventarioService.getConditionLabel(condition);
  }

  getHistoryEventLabel(event: UnitHistoryEvent): string {
    return this.inventarioService.getHistoryEventLabel(event);
  }
}
