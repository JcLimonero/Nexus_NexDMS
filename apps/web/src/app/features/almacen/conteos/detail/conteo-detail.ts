import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService, StockCount } from "../../almacen.service";

@Component({
  selector: "app-conteo-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./conteo-detail.html",
  styleUrls: ["./conteo-detail.scss"],
})
export class ConteoDetail implements OnInit {
  private almacenService = inject(AlmacenService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  conteo = signal<StockCount | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  guardando = signal(false);
  aplicando = signal(false);

  /** Capturas en vivo por lineId, editables sin tocar el modelo del servidor. */
  capturado: Record<string, number | null> = {};

  abierto = computed(() => this.conteo()?.status === "OPEN");

  /** Cuántos renglones tienen diferencia contra el sistema (ya guardados). */
  conDiferencia = computed(
    () =>
      (this.conteo()?.lines ?? []).filter(
        (l) => l.difference !== null && l.difference !== 0,
      ).length,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/warehouse/conteos"]);
      return;
    }
    this.cargar(id);
  }

  private cargar(id: string): void {
    this.loading.set(true);
    this.almacenService.getStockCount(id).subscribe({
      next: (c) => {
        this.conteo.set(c);
        this.capturado = {};
        for (const l of c.lines ?? []) this.capturado[l.id] = l.countedQty;
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar el conteo");
      },
    });
  }

  recargar(): void {
    const c = this.conteo();
    if (c) this.cargar(c.id);
  }

  getStatusLabel(status: string): string {
    return this.almacenService.getCountStatusLabel(status);
  }

  /** Diferencia en vivo mientras se captura (contado − sistema). */
  diferenciaViva(lineId: string, systemQty: number): number | null {
    const v = this.capturado[lineId];
    return v === null || v === undefined ? null : v - systemQty;
  }

  guardar(): void {
    const c = this.conteo();
    if (!c || this.guardando()) return;
    const lines = Object.entries(this.capturado)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([lineId, countedQty]) => ({
        lineId,
        countedQty: countedQty as number,
      }));
    if (lines.length === 0) {
      this.toastr.warning("Captura al menos un renglón");
      return;
    }
    this.guardando.set(true);
    this.almacenService.saveStockCounts(c.id, lines).subscribe({
      next: (updated) => {
        this.conteo.set(updated);
        this.guardando.set(false);
        this.toastr.success("Conteo guardado");
      },
      error: (err) => {
        this.guardando.set(false);
        this.toastr.error(err?.error?.message || "No se pudo guardar");
      },
    });
  }

  aplicar(): void {
    const c = this.conteo();
    if (!c || this.aplicando()) return;
    if (
      !confirm(
        "¿Aplicar el conteo? Se generarán los ajustes y se actualizarán las existencias. No se puede deshacer.",
      )
    )
      return;
    this.aplicando.set(true);
    this.almacenService.applyStockCount(c.id).subscribe({
      next: () => {
        this.aplicando.set(false);
        this.toastr.success("Conteo aplicado; existencias reconciliadas");
        this.recargar();
      },
      error: (err) => {
        this.aplicando.set(false);
        this.toastr.error(err?.error?.message || "No se pudo aplicar");
      },
    });
  }

  cancelar(): void {
    const c = this.conteo();
    if (!c) return;
    if (!confirm("¿Cancelar este conteo? No afectará las existencias.")) return;
    this.almacenService.cancelStockCount(c.id).subscribe({
      next: () => {
        this.toastr.success("Conteo cancelado");
        this.recargar();
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "No se pudo cancelar"),
    });
  }
}
