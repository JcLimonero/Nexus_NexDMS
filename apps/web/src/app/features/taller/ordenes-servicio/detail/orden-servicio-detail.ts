import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { TallerService } from "../../taller.service";
import { PanelServicio } from "./panel-servicio";
import { EvidenciaRecepcion } from "../../../../shared/components/evidencia-recepcion/evidencia-recepcion";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../../inventario-refacciones/inventario-refacciones.service";
import { Part } from "../../../inventario-refacciones/models/part.model";
import {
  ServiceOrder,
  ServiceOrderStatus,
  PromiseChange,
} from "../../models/service-order.model";

const NEXT_STATUS: Partial<Record<ServiceOrderStatus, ServiceOrderStatus[]>> = {
  [ServiceOrderStatus.RECEIVED]: [ServiceOrderStatus.DIAGNOSIS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.DIAGNOSIS]: [ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.IN_PROGRESS]: [
    ServiceOrderStatus.WAITING_PARTS,
    ServiceOrderStatus.READY,
    ServiceOrderStatus.CANCELLED,
  ],
  [ServiceOrderStatus.WAITING_PARTS]: [ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.CANCELLED],
  [ServiceOrderStatus.READY]: [ServiceOrderStatus.DELIVERED, ServiceOrderStatus.CANCELLED],
};

@Component({
  selector: "app-orden-servicio-detail",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PanelServicio,
    EvidenciaRecepcion,
  ],
  templateUrl: "./orden-servicio-detail.html",
  styleUrls: ["./orden-servicio-detail.scss"],
})
export class OrdenServicioDetail implements OnInit {
  private tallerService = inject(TallerService);
  private http = inject(HttpClient);
  private branchesService = inject(BranchesService);
  private inventario = inject(InventarioRefaccionesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  orden = signal<ServiceOrder | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  mechanics = signal<{ id: string; firstName: string; lastName: string }[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  changingStatus = signal(false);
  assigningMechanic = signal(false);
  cancelling = signal(false);
  selectedStatus = signal<ServiceOrderStatus | "">("");
  selectedMechanicId = signal<string>("");

  // Edición de la fecha prometida (con justificación) + su historial.
  editandoPromesa = signal(false);
  guardandoPromesa = signal(false);
  nuevaPromesa = signal<string>("");
  motivoPromesa = signal<string>("");
  historialPromesa = signal<PromiseChange[]>([]);
  verHistorialPromesa = signal(false);

  /** Fecha ISO → valor para <input type="datetime-local"> (hora local). */
  private aInputLocal(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  abrirEdicionPromesa(): void {
    const o = this.orden();
    this.nuevaPromesa.set(this.aInputLocal(o?.promisedAt ?? null));
    this.motivoPromesa.set("");
    this.editandoPromesa.set(true);
  }

  guardarPromesa(): void {
    const o = this.orden();
    if (!o) return;
    const motivo = this.motivoPromesa().trim();
    if (motivo.length < 3) {
      this.toastr.warning("Escribe el motivo del cambio (mín. 3 caracteres)");
      return;
    }
    const iso = this.nuevaPromesa()
      ? new Date(this.nuevaPromesa()).toISOString()
      : null;
    this.guardandoPromesa.set(true);
    this.tallerService.updatePromisedDate(o.id, iso, motivo).subscribe({
      next: (upd) => {
        this.orden.set(upd);
        this.guardandoPromesa.set(false);
        this.editandoPromesa.set(false);
        this.toastr.success("Fecha prometida actualizada");
        if (this.verHistorialPromesa()) this.cargarHistorialPromesa();
      },
      error: (err) => {
        this.guardandoPromesa.set(false);
        this.toastr.error(err?.error?.message || "No se pudo actualizar");
      },
    });
  }

  cargarHistorialPromesa(): void {
    const o = this.orden();
    if (!o) return;
    this.tallerService.getPromiseHistory(o.id).subscribe({
      next: (h) => this.historialPromesa.set(h),
    });
  }

  toggleHistorialPromesa(): void {
    const abrir = !this.verHistorialPromesa();
    this.verHistorialPromesa.set(abrir);
    if (abrir) this.cargarHistorialPromesa();
  }

  // Solicitar una refacción al almacén: crea una requisición ligada a la orden.
  solicitandoRefaccion = signal(false);
  enviandoSolicitud = signal(false);
  partesDisponibles = signal<Part[]>([]);
  refaccionElegida = signal<string>("");
  cantidadRefaccion = signal<number>(1);
  notaRefaccion = signal<string>("");

  abrirSolicitudRefaccion(): void {
    const o = this.orden();
    if (!o) return;
    this.refaccionElegida.set("");
    this.cantidadRefaccion.set(1);
    this.notaRefaccion.set("");
    this.solicitandoRefaccion.set(true);
    if (!this.partesDisponibles().length) {
      this.inventario
        .getParts({ branchId: o.branchId, limit: 500, searchScope: "local" })
        .subscribe({ next: (res) => this.partesDisponibles.set(res.data) });
    }
  }

  solicitarRefaccion(): void {
    const o = this.orden();
    if (!o) return;
    if (!this.refaccionElegida()) {
      this.toastr.warning("Elige la refacción a solicitar");
      return;
    }
    this.enviandoSolicitud.set(true);
    this.tallerService
      .requestPart(o.id, {
        partId: this.refaccionElegida(),
        quantity: Number(this.cantidadRefaccion()) || 1,
        note: this.notaRefaccion().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enviandoSolicitud.set(false);
          this.solicitandoRefaccion.set(false);
          this.toastr.success("Refacción solicitada (requisición creada)");
          // La orden pudo pasar a "esperando refacciones".
          this.tallerService.getServiceOrder(o.id).subscribe({
            next: (upd) => this.orden.set(upd),
          });
        },
        error: (err) => {
          this.enviandoSolicitud.set(false);
          this.toastr.error(err?.error?.message || "No se pudo solicitar");
        },
      });
  }

  /**
   * Abre la orden en PDF.
   *
   * Se pide como blob y no se navega a la dirección: el endpoint exige la
   * credencial en la cabecera, y una pestaña nueva no la lleva —saldría un
   * 401 en vez del documento—. El interceptor sí la pone en esta petición.
   */
  imprimir(id: string): void {
    this.http
      .get(`/api/v1/service-orders/${id}/pdf`, { responseType: "blob" })
      .subscribe({
        next: (pdf) => {
          const url = URL.createObjectURL(pdf);
          window.open(url, "_blank", "noopener");
          // Se libera con holgura: revocarla de inmediato deja la pestaña
          // nueva sin nada que mostrar.
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: () => this.toastr.error("No se pudo generar el PDF de la orden"),
      });
  }

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/workshop/service-orders"]);
      return;
    }

    this.tallerService.getServiceOrder(id).subscribe({
      next: (o) => {
        this.orden.set(o);
        this.loading.set(false);
        this.error.set(null);
        if (o.branchId) {
          this.tallerService.getMechanicsForBranch(o.branchId).subscribe({
            next: (m) => this.mechanics.set(m),
          });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar orden");
      },
    });
  }

  getBranchName(id: string): string {
    return this.branches().find((b) => b.id === id)?.name ?? id;
  }

  getOwnerName(o: ServiceOrder): string {
    const owner = o.owner;
    if (!owner) return "—";
    if (owner.companyName) return owner.companyName;
    const parts = [owner.firstName, owner.lastName].filter(Boolean);
    return parts.join(" ") || owner.phone || "—";
  }

  getVehicleLabel(o: ServiceOrder): string {
    const v = o.vehicle;
    if (!v) return "—";
    return `${v.year} ${v.make} ${v.model}` + (v.plate ? ` (${v.plate})` : "");
  }

  getMechanicLabel(o: ServiceOrder): string {
    const m = o.mechanic;
    return m ? `${m.firstName} ${m.lastName}` : "—";
  }

  getStatusLabel(status: string): string {
    return this.tallerService.getStatusLabel(status);
  }

  getNextStatuses(): ServiceOrderStatus[] {
    const o = this.orden();
    if (!o) return [];
    return NEXT_STATUS[o.status as ServiceOrderStatus] ?? [];
  }

  canAssignMechanic(): boolean {
    const o = this.orden();
    if (!o || o.status === ServiceOrderStatus.CANCELLED || o.status === ServiceOrderStatus.DELIVERED) return false;
    return true;
  }

  canCancel(): boolean {
    const o = this.orden();
    return !!o && o.status !== ServiceOrderStatus.CANCELLED && o.status !== ServiceOrderStatus.DELIVERED;
  }

  onStatusChange(): void {
    const o = this.orden();
    const status = this.selectedStatus();
    if (!o || !status || this.changingStatus()) return;
    // Entregar no es un cambio de estado normal: pide cobro o adeudo.
    if (status === ServiceOrderStatus.DELIVERED) {
      this.abrirEntrega();
      return;
    }
    if (!confirm(`¿Cambiar estado a ${this.getStatusLabel(status)}?`)) return;

    this.changingStatus.set(true);
    this.tallerService.changeStatus(o.id, status).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.selectedStatus.set("");
        this.toastr.success("Estado actualizado");
        this.changingStatus.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cambiar estado");
        this.changingStatus.set(false);
      },
    });
  }

  // ── Entrega: con cobro o con adeudo (R6) ──
  entregaAbierta = signal(false);
  entregando = signal(false);
  entregaConAdeudo = signal(false);
  entregaPago = signal("CASH");
  entregaPromesa = signal("");
  readonly pagoOpciones = [
    { v: "CASH", n: "Efectivo" },
    { v: "CARD", n: "Tarjeta" },
    { v: "TRANSFER", n: "Transferencia" },
    { v: "MIXED", n: "Mixto" },
  ];

  abrirEntrega(): void {
    this.entregaConAdeudo.set(false);
    this.entregaPago.set("CASH");
    this.entregaPromesa.set("");
    this.entregaAbierta.set(true);
  }

  confirmarEntrega(): void {
    const o = this.orden();
    if (!o || this.entregando()) return;
    const conAdeudo = this.entregaConAdeudo();
    if (conAdeudo && !this.entregaPromesa()) {
      this.toastr.warning("Indica la fecha promesa de pago");
      return;
    }
    this.entregando.set(true);
    this.tallerService
      .deliver(o.id, {
        conAdeudo,
        paymentMethod: conAdeudo ? undefined : this.entregaPago(),
        fechaPromesaPago: conAdeudo ? this.entregaPromesa() : undefined,
      })
      .subscribe({
        next: (updated) => {
          this.orden.set(updated);
          this.entregaAbierta.set(false);
          this.entregando.set(false);
          this.selectedStatus.set("");
          this.toastr.success(
            conAdeudo
              ? "Entregada con adeudo — se generó la cuenta por cobrar"
              : "Orden entregada",
          );
        },
        error: (err) => {
          this.entregando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo entregar");
        },
      });
  }

  // ── Vale de compra ligado a la orden (R2) ──
  valeAbierto = signal(false);
  guardandoVale = signal(false);
  valeMonto = signal<number | null>(null);
  valeConcepto = signal("");
  valeProveedor = signal("");

  abrirVale(): void {
    this.valeMonto.set(null);
    this.valeConcepto.set("");
    this.valeProveedor.set("");
    this.valeAbierto.set(true);
  }

  confirmarVale(): void {
    const o = this.orden();
    if (!o || this.guardandoVale()) return;
    const monto = this.valeMonto();
    if (!monto || monto <= 0) {
      this.toastr.warning("Indica el monto");
      return;
    }
    if (!this.valeConcepto().trim()) {
      this.toastr.warning("Indica qué se compró");
      return;
    }
    this.guardandoVale.set(true);
    this.tallerService
      .valeDeCompra(o.branchId, {
        amount: monto,
        concept: this.valeConcepto().trim(),
        reference: this.valeProveedor().trim() || undefined,
        serviceOrderId: o.id,
      })
      .subscribe({
        next: () => {
          this.guardandoVale.set(false);
          this.valeAbierto.set(false);
          this.toastr.success("Vale de compra registrado en caja");
        },
        error: (err) => {
          this.guardandoVale.set(false);
          this.toastr.error(
            err?.error?.message ||
              "No se pudo registrar el vale (¿hay caja abierta?)",
          );
        },
      });
  }

  onAssignMechanic(): void {
    const o = this.orden();
    const mechanicId = this.selectedMechanicId();
    if (!o || !mechanicId || this.assigningMechanic()) return;

    this.assigningMechanic.set(true);
    this.tallerService.assignMechanic(o.id, mechanicId).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.selectedMechanicId.set("");
        this.toastr.success("Técnico asignado");
        this.assigningMechanic.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al asignar técnico");
        this.assigningMechanic.set(false);
      },
    });
  }

  onCancel(): void {
    const o = this.orden();
    if (!o || this.cancelling()) return;
    if (!confirm("¿Cancelar esta orden de servicio?")) return;

    this.cancelling.set(true);
    this.tallerService.cancelServiceOrder(o.id).subscribe({
      next: (updated) => {
        this.orden.set(updated);
        this.toastr.success("Orden cancelada");
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cancelar");
        this.cancelling.set(false);
      },
    });
  }
}
