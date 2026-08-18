import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { InventarioRefaccionesService } from "../../inventario-refacciones.service";
import { ComprasService } from "../../../compras/compras.service";
import {
  Part,
  PartEquivalence,
  PartSupplierTop,
} from "../../models/part.model";

@Component({
  selector: "app-parte-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./parte-detail.html",
  styleUrls: ["./parte-detail.scss"],
})
export class ParteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioRefaccionesService);
  private comprasService = inject(ComprasService);
  private toastr = inject(ToastrService);

  parte = signal<Part | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  equivalencias = signal<PartEquivalence[]>([]);
  topProveedores = signal<PartSupplierTop[]>([]);
  proveedorNombre = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/parts-inventory"]);
      return;
    }

    this.inventarioService.getPart(id).subscribe({
      next: (p) => {
        this.parte.set(p);
        this.loading.set(false);
        this.error.set(null);
        if (p.preferredSupplierId) {
          this.comprasService.getSupplier(p.preferredSupplierId).subscribe({
            next: (s) => this.proveedorNombre.set(s.name),
          });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar parte");
      },
    });

    this.inventarioService.getEquivalences(id).subscribe({
      next: (eqs) => this.equivalencias.set(eqs),
    });
    this.inventarioService.getTopSuppliers(id).subscribe({
      next: (t) => this.topProveedores.set(t),
    });
  }

  getVehicleTypeLabel(type: string): string {
    return this.inventarioService.getVehicleTypeLabel(type);
  }

  deleteParte(): void {
    const p = this.parte();
    if (!p || !confirm(`¿Eliminar la parte "${p.name}"?`)) return;

    this.inventarioService.deletePart(p.id).subscribe({
      next: () => {
        this.toastr.success("Parte eliminada");
        this.router.navigate(["/parts-inventory"]);
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al eliminar"),
    });
  }
}
