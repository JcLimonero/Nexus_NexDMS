import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import { AlmacenService, Valuation, ValuationItem } from "../almacen.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-costeo",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./costeo.html",
  styleUrls: ["./costeo.scss"],
})
export class Costeo implements OnInit {
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");
  valuation = signal<Valuation | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Entrada de compra
  entradaAbierta = signal(false);
  entradaPart = signal<ValuationItem | null>(null);
  entradaQty = 0;
  entradaCosto = 0;
  guardandoEntrada = signal(false);

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        const list = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(list);
        if (list.length && !this.branchId()) {
          this.branchId.set(list[0].id);
          this.cargar();
        }
      },
    });
  }

  onBranchChange(id: string): void {
    this.branchId.set(id);
    this.cargar();
  }

  cargar(): void {
    const b = this.branchId();
    if (!b) return;
    this.loading.set(true);
    this.almacenService.getValuation(b).subscribe({
      next: (v) => {
        this.valuation.set(v);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar la valuación");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  abrirEntrada(item: ValuationItem): void {
    this.entradaPart.set(item);
    this.entradaQty = 0;
    this.entradaCosto = item.averageCost;
    this.entradaAbierta.set(true);
  }

  guardarEntrada(): void {
    const part = this.entradaPart();
    if (!part || this.guardandoEntrada()) return;
    if (this.entradaQty <= 0) {
      this.toastr.warning("La cantidad debe ser mayor a cero");
      return;
    }
    if (this.entradaCosto <= 0) {
      this.toastr.warning("El costo unitario debe ser mayor a cero");
      return;
    }
    this.guardandoEntrada.set(true);
    this.almacenService
      .registrarEntrada({
        partId: part.partId,
        branchId: this.branchId(),
        quantity: this.entradaQty,
        unitCost: this.entradaCosto,
      })
      .subscribe({
        next: () => {
          this.guardandoEntrada.set(false);
          this.entradaAbierta.set(false);
          this.toastr.success("Entrada registrada; costo promedio actualizado");
          this.cargar();
        },
        error: (err) => {
          this.guardandoEntrada.set(false);
          this.toastr.error(err?.error?.message || "No se pudo registrar la entrada");
        },
      });
  }
}
