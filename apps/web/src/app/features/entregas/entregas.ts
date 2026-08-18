import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import {
  EntregasService,
  Delivery,
  DeliveryKind,
  ChecklistItem,
} from "./entregas.service";
import { BranchesService } from "../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-entregas",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./entregas.html",
})
export class Entregas implements OnInit {
  private srv = inject(EntregasService);
  private branchesSrv = inject(BranchesService);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);
  entregas = signal<Delivery[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);

  kind: DeliveryKind = "UNIT_SALE";
  branchId = "";
  referenceLabel = "";
  notes = "";
  checklist = signal<ChecklistItem[]>([]);

  ngOnInit(): void {
    const tipo = this.route.snapshot.queryParamMap.get("tipo");
    if (tipo === "SERVICE" || tipo === "UNIT_SALE") this.kind = tipo;

    this.branchesSrv.getAll().subscribe({
      next: (res) => {
        const bs = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(bs);
        if (bs.length && !this.branchId) this.branchId = bs[0].id;
      },
    });
    this.cargarPlantilla();
    this.cargar();
  }

  etiquetaKind(k: DeliveryKind): string {
    return k === "UNIT_SALE" ? "Entrega de unidad" : "Entrega de taller";
  }

  cambiarTipo(k: DeliveryKind): void {
    this.kind = k;
    this.cargarPlantilla();
  }

  cargarPlantilla(): void {
    this.srv.getTemplate(this.kind).subscribe({
      next: (items) => this.checklist.set(items),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.getDeliveries().subscribe({
      next: (rows) => {
        this.entregas.set(rows);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  hechos(d: Delivery): string {
    const total = d.checklist.length;
    const ok = d.checklist.filter((i) => i.done).length;
    return `${ok}/${total}`;
  }

  guardar(): void {
    if (!this.branchId) {
      this.toastr.warning("Elige sucursal");
      return;
    }
    this.guardando.set(true);
    this.srv
      .create({
        branchId: this.branchId,
        kind: this.kind,
        referenceLabel: this.referenceLabel || undefined,
        notes: this.notes || undefined,
        checklist: this.checklist(),
      })
      .subscribe({
        next: (d) => {
          this.guardando.set(false);
          this.toastr.success(`Acta ${d.folio} registrada`);
          this.referenceLabel = "";
          this.notes = "";
          this.cargarPlantilla();
          this.cargar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo registrar");
        },
      });
  }
}
