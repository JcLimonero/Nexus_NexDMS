import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  CitasVentasService,
  SalesAppointment,
  SalesApptPurpose,
  SalesApptStatus,
} from "./citas-ventas.service";
import { BranchesService } from "../inventario-refacciones/services/branches.service";

@Component({
  selector: "app-citas-ventas",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./citas-ventas.html",
})
export class CitasVentas implements OnInit {
  private srv = inject(CitasVentasService);
  private branchesSrv = inject(BranchesService);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);
  citas = signal<SalesAppointment[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);

  form = {
    branchId: "",
    clientName: "",
    clientPhone: "",
    purpose: "TEST_DRIVE" as SalesApptPurpose,
    unitLabel: "",
    scheduledAt: "",
    notes: "",
  };

  readonly purposes: { value: SalesApptPurpose; label: string }[] = [
    { value: "TEST_DRIVE", label: "Prueba de manejo" },
    { value: "DELIVERY", label: "Entrega" },
    { value: "VISIT", label: "Visita / cotización" },
    { value: "FOLLOW_UP", label: "Seguimiento" },
  ];

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
        this.citas.set(rows);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  purposeLabel(p: SalesApptPurpose): string {
    return this.purposes.find((x) => x.value === p)?.label ?? p;
  }

  statusLabel(s: SalesApptStatus): string {
    return {
      SCHEDULED: "Agendada",
      CONFIRMED: "Confirmada",
      DONE: "Realizada",
      CANCELLED: "Cancelada",
      NO_SHOW: "No asistió",
    }[s];
  }

  guardar(): void {
    if (!this.form.clientName.trim() || !this.form.scheduledAt) {
      this.toastr.warning("Captura el cliente y la fecha/hora");
      return;
    }
    this.guardando.set(true);
    this.srv
      .create({
        branchId: this.form.branchId || undefined,
        clientName: this.form.clientName,
        clientPhone: this.form.clientPhone || undefined,
        purpose: this.form.purpose,
        unitLabel: this.form.unitLabel || undefined,
        scheduledAt: new Date(this.form.scheduledAt).toISOString(),
        notes: this.form.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Cita agendada");
          this.form.clientName = "";
          this.form.clientPhone = "";
          this.form.unitLabel = "";
          this.form.scheduledAt = "";
          this.form.notes = "";
          this.cargar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo agendar");
        },
      });
  }

  cambiarEstado(c: SalesAppointment, status: SalesApptStatus): void {
    this.srv.updateStatus(c.id, status).subscribe({
      next: () => {
        this.toastr.success("Cita actualizada");
        this.cargar();
      },
      error: () => this.toastr.error("No se pudo actualizar"),
    });
  }
}
