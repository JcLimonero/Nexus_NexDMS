import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService, StockCount } from "../../almacen.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-conteos-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./conteos-list.html",
  styleUrls: ["./conteos-list.scss"],
})
export class ConteosList implements OnInit {
  private almacenService = inject(AlmacenService);
  private branchesService = inject(BranchesService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  conteos = signal<StockCount[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Nuevo conteo
  nuevoAbierto = signal(false);
  nuevaBranch = signal<string>("");
  nuevasNotas = "";
  abriendo = signal(false);

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        const list = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(list);
        if (list.length) this.nuevaBranch.set(list[0].id);
      },
    });
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.almacenService.getStockCounts().subscribe({
      next: (list) => {
        this.conteos.set(list);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar conteos");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getStatusLabel(status: string): string {
    return this.almacenService.getCountStatusLabel(status);
  }

  abrirNuevo(): void {
    this.nuevasNotas = "";
    this.nuevoAbierto.set(true);
  }

  crear(): void {
    if (this.abriendo()) return;
    if (!this.nuevaBranch()) {
      this.toastr.warning("Selecciona la sucursal");
      return;
    }
    this.abriendo.set(true);
    this.almacenService
      .openStockCount({
        branchId: this.nuevaBranch(),
        notes: this.nuevasNotas.trim() || undefined,
      })
      .subscribe({
        next: (c) => {
          this.abriendo.set(false);
          this.nuevoAbierto.set(false);
          this.toastr.success(`Conteo ${c.folio} abierto`);
          this.router.navigate(["/warehouse/conteos", c.id]);
        },
        error: (err) => {
          this.abriendo.set(false);
          this.toastr.error(err?.error?.message || "No se pudo abrir el conteo");
        },
      });
  }
}
