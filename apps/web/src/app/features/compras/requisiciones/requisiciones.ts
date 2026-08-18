import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { ComprasService } from "../compras.service";
import { PurchaseRequisition } from "../models/purchase-order.model";
import { Supplier } from "../models/supplier.model";

/**
 * Cola de "por pedir": refacciones bajo demanda o pedidas a mano. Se
 * seleccionan y se convierten en una orden de compra en borrador.
 */
@Component({
  selector: "app-requisiciones",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-0">Por pedir</h5>
            <small class="text-muted">
              Refacciones pendientes de compra (bajo demanda o manuales).
            </small>
          </div>
          <a class="btn btn-outline-secondary btn-sm" routerLink="/purchases/purchase-orders">
            Órdenes de compra
          </a>
        </div>
        <div class="card-body">
          @if (loading()) {
            <div class="spinner-border" role="status"></div>
          } @else if (!requisiciones().length) {
            <p class="text-muted mb-0">No hay refacciones pendientes de pedir.</p>
          } @else {
            <div class="row g-2 align-items-end mb-3">
              <div class="col-md-5">
                <label class="form-label">Proveedor para la orden</label>
                <select class="form-select" [(ngModel)]="supplierId">
                  <option value="">Seleccionar proveedor…</option>
                  @for (s of suppliers(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>
              <div class="col-md-4">
                <button
                  class="btn btn-primary"
                  [disabled]="!supplierId || !seleccionadas().length || converting()"
                  (click)="convertir()"
                >
                  Generar orden de compra ({{ seleccionadas().length }})
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead>
                  <tr>
                    <th style="width: 40px"></th>
                    <th>Refacción</th>
                    <th style="width: 110px">Cantidad</th>
                    <th style="width: 130px">Origen</th>
                    <th style="width: 90px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of requisiciones(); track r.id) {
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          class="form-check-input"
                          [checked]="sel[r.id]"
                          (change)="toggle(r.id)"
                        />
                      </td>
                      <td>
                        <strong>{{ r.partSku || "—" }}</strong>
                        <div class="text-muted small">{{ r.partName }}</div>
                      </td>
                      <td>{{ r.quantity }}</td>
                      <td>
                        <span class="badge bg-light text-dark">{{ origen(r.sourceType) }}</span>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-outline-danger" (click)="cancelar(r)">
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class Requisiciones implements OnInit {
  private compras = inject(ComprasService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  loading = signal(true);
  converting = signal(false);
  requisiciones = signal<PurchaseRequisition[]>([]);
  suppliers = signal<Supplier[]>([]);
  supplierId = "";
  sel: Record<string, boolean> = {};

  ngOnInit(): void {
    this.cargar();
    this.compras.getSuppliers({ isActive: true, limit: 500 }).subscribe({
      next: (res) => this.suppliers.set(res.data),
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.compras.getRequisitions("PENDING").subscribe({
      next: (rows) => {
        this.requisiciones.set(rows);
        this.sel = {};
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  origen(t: string): string {
    return t === "quotation" ? "Presupuesto" : t === "manual" ? "Manual" : t;
  }

  toggle(id: string): void {
    this.sel[id] = !this.sel[id];
  }

  seleccionadas(): string[] {
    return Object.keys(this.sel).filter((k) => this.sel[k]);
  }

  convertir(): void {
    const ids = this.seleccionadas();
    if (!ids.length || !this.supplierId) return;
    this.converting.set(true);
    this.compras.convertRequisitions(ids, this.supplierId).subscribe({
      next: (res) => {
        this.converting.set(false);
        this.toastr.success(`Orden ${res.order.folio} creada en borrador`);
        this.router.navigate(["/purchases/purchase-orders", res.order.id]);
      },
      error: (err) => {
        this.converting.set(false);
        this.toastr.error(err?.error?.message || "No se pudo generar la orden");
      },
    });
  }

  cancelar(r: PurchaseRequisition): void {
    this.compras.cancelRequisition(r.id).subscribe({
      next: () => {
        this.toastr.success("Requisición cancelada");
        this.cargar();
      },
      error: () => this.toastr.error("No se pudo cancelar"),
    });
  }
}
