import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  EncuestasVentaService,
  SaleSurvey,
  SaleSurveyResumen,
} from "./encuestas-venta.service";
import { BranchesService } from "../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-encuestas-venta",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./encuestas-venta.html",
})
export class EncuestasVenta implements OnInit {
  private srv = inject(EncuestasVentaService);
  private branchesSrv = inject(BranchesService);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);
  encuestas = signal<SaleSurvey[]>([]);
  resumen = signal<SaleSurveyResumen | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);

  form = { branchId: "", referenceLabel: "", clientName: "" };

  ngOnInit(): void {
    this.branchesSrv.getAll().subscribe({
      next: (res) => {
        const bs = res.data.map((b) => ({ id: b.id, name: b.name }));
        this.branches.set(bs);
        if (bs.length && !this.form.branchId) this.form.branchId = bs[0].id;
      },
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.getAll().subscribe({
      next: (rows) => {
        this.encuestas.set(rows);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.srv.resumen().subscribe({ next: (r) => this.resumen.set(r) });
  }

  link(token: string): string {
    return `${window.location.origin}/sv/${token}`;
  }

  copiar(token: string): void {
    navigator.clipboard?.writeText(this.link(token));
    this.toastr.success("Link copiado");
  }

  generar(): void {
    this.guardando.set(true);
    this.srv
      .create({
        branchId: this.form.branchId || undefined,
        referenceLabel: this.form.referenceLabel || undefined,
        clientName: this.form.clientName || undefined,
      })
      .subscribe({
        next: (s) => {
          this.guardando.set(false);
          this.toastr.success("Encuesta generada");
          this.copiar(s.token);
          this.form.referenceLabel = "";
          this.form.clientName = "";
          this.cargar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo generar");
        },
      });
  }
}
