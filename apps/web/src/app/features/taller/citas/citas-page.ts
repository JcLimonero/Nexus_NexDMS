import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import { CitasService, Appointment } from "./citas.service";
import {
  DisponibilidadRefacciones,
  TallerService,
} from "../taller.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { ClientesService } from "../../clientes/clientes.service";
import { ClientSelector } from "../../clientes/client-selector/client-selector";
import { ClientListItem } from "../../clientes/models/client.model";
import { CustomerVehicle } from "../../clientes/models/client.model";
import {
  CapacityMatrix,
  SlotSelection,
} from "./capacity-matrix/capacity-matrix";
import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-citas-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FeatherIcons,
    ClientSelector,
    CapacityMatrix,
  ],
  templateUrl: "./citas-page.html",
  styleUrls: ["./citas-page.scss"],
})
export class CitasPage implements OnInit {
  private citasService = inject(CitasService);
  private tallerService = inject(TallerService);
  private branchesService = inject(BranchesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  // ─── Filtros / contexto ───
  branches = signal<{ id: string; name: string }[]>([]);
  branchId = signal<string>("");
  date = signal<string>(new Date().toISOString().slice(0, 10));

  // ─── Citas del día ───
  citas = signal<Appointment[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // ─── Nueva cita ───
  showForm = signal(false);
  clients = signal<ClientListItem[]>([]);
  vehicles = signal<CustomerVehicle[]>([]);
  vehiclesLoading = signal(false);
  serviceTypes = signal<{ id: string; name: string }[]>([]);
  saving = signal(false);

  form = signal<{
    clientId: string;
    vehicleId: string;
    serviceTypeId: string;
    serviceType: string;
    notes: string;
  }>({
    clientId: "",
    vehicleId: "",
    serviceTypeId: "",
    serviceType: "",
    notes: "",
  });

  selectedSlot = signal<SlotSelection | null>(null);

  canSave = computed(
    () =>
      !!this.branchId() &&
      !!this.form().clientId &&
      !!this.selectedSlot() &&
      !!(this.form().serviceTypeId || this.form().serviceType) &&
      !this.saving(),
  );

  pendientes = computed(
    () =>
      this.citas().filter((c) => c.status === "PENDING_CONFIRMATION").length,
  );

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (res) => {
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name })));
        if (res.data.length > 0 && !this.branchId()) {
          this.branchId.set(res.data[0].id);
          this.loadDay();
          this.loadServiceTypes();
        }
      },
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });
  }

  loadDay(): void {
    const branchId = this.branchId();
    if (!branchId) return;
    this.loading.set(true);
    const date = this.date();
    this.citasService
      .getAppointments({
        branchId,
        dateFrom: date,
        dateTo: date,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.citas.set(res.data);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || "Error al cargar citas");
        },
      });
  }

  loadServiceTypes(): void {
    const branchId = this.branchId();
    if (!branchId) return;
    this.tallerService.getServiceTypes(branchId).subscribe({
      next: (st) => this.serviceTypes.set(st),
      error: () => this.serviceTypes.set([]),
    });
  }

  onBranchChange(id: string): void {
    this.branchId.set(id);
    this.selectedSlot.set(null);
    this.loadDay();
    this.loadServiceTypes();
  }

  onDateChange(d: string): void {
    this.date.set(d);
    this.selectedSlot.set(null);
    this.loadDay();
  }

  shiftDate(days: number): void {
    const d = new Date(this.date() + "T12:00:00");
    d.setDate(d.getDate() + days);
    this.onDateChange(d.toISOString().slice(0, 10));
  }

  onClientChange(clientId: string): void {
    this.form.update((f) => ({ ...f, clientId, vehicleId: "" }));
    this.vehicles.set([]);
    if (clientId) {
      this.vehiclesLoading.set(true);
      this.tallerService.getVehiclesByClient(clientId).subscribe({
        next: (v) => {
          this.vehicles.set(v);
          this.vehiclesLoading.set(false);
        },
        error: () => this.vehiclesLoading.set(false),
      });
    }
  }

  onServiceTypeChange(serviceTypeId: string): void {
    const st = this.serviceTypes().find((s) => s.id === serviceTypeId);
    this.form.update((f) => ({
      ...f,
      serviceTypeId,
      serviceType: st?.name ?? f.serviceType,
    }));
    // Cambia la duración → la matriz se recarga sola por el input serviceTypeId
    this.selectedSlot.set(null);
    this.revisarRefacciones(serviceTypeId);
  }

  /**
   * Refacciones del servicio elegido.
   *
   * Se consulta al elegirlo y no al guardar: avisar después deja la cita
   * puesta y el problema lo descubre quien recibe la unidad, que es cuando
   * ya no se puede pedir nada. No bloquea el agendado —hay tiempo para
   * surtir antes del día de la cita—, solo lo dice.
   */
  faltantes = signal<DisponibilidadRefacciones | null>(null);
  revisandoRefacciones = signal(false);

  private revisarRefacciones(serviceTypeId: string): void {
    this.faltantes.set(null);
    const branchId = this.branchId();
    if (!serviceTypeId || !branchId) return;
    this.revisandoRefacciones.set(true);
    this.tallerService.getPartsAvailability(serviceTypeId, branchId).subscribe({
      next: (r) => {
        this.faltantes.set(r.available ? null : r);
        this.revisandoRefacciones.set(false);
      },
      // Si no se puede consultar no se inventa un "todo bien": se calla y
      // deja agendar, que es lo que se hacía antes de tener el aviso.
      error: () => this.revisandoRefacciones.set(false),
    });
  }

  onSlotSelected(slot: SlotSelection): void {
    this.selectedSlot.set(slot);
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.resetForm();
  }

  resetForm(): void {
    this.form.set({
      clientId: "",
      vehicleId: "",
      serviceTypeId: "",
      serviceType: "",
      notes: "",
    });
    this.vehicles.set([]);
    this.selectedSlot.set(null);
    this.faltantes.set(null);
  }

  save(): void {
    const slot = this.selectedSlot();
    if (!slot || !this.canSave()) return;
    const f = this.form();
    this.saving.set(true);
    this.citasService
      .create({
        branchId: this.branchId(),
        origin: "INTERNAL",
        clientId: f.clientId || undefined,
        vehicleId: f.vehicleId || undefined,
        mechanicId: slot.mechanicId,
        serviceTypeId: f.serviceTypeId || undefined,
        serviceType: f.serviceType || "Servicio",
        notes: f.notes || undefined,
        scheduledAt: slot.start,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toastr.success("Cita creada");
          this.toggleForm();
          this.loadDay();
        },
        error: (err) => {
          this.saving.set(false);
          this.toastr.error(err?.error?.message || "Error al crear la cita");
        },
      });
  }

  confirm(cita: Appointment): void {
    this.citasService.confirm(cita.id).subscribe({
      next: () => {
        this.toastr.success("Cita confirmada");
        this.loadDay();
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al confirmar"),
    });
  }

  complete(cita: Appointment): void {
    this.citasService.complete(cita.id).subscribe({
      next: () => {
        this.toastr.success("Cita completada");
        this.loadDay();
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al completar"),
    });
  }

  cancel(cita: Appointment): void {
    this.citasService.cancel(cita.id).subscribe({
      next: () => {
        this.toastr.info("Cita cancelada");
        this.loadDay();
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || "Error al cancelar"),
    });
  }

  // ─── Helpers de despliegue ───
  statusLabel(s: string): string {
    return this.citasService.getStatusLabel(s);
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      PENDING_CONFIRMATION: "badge-warning",
      SCHEDULED: "badge-info",
      CONFIRMED: "badge-success",
      COMPLETED: "badge-primary",
      CANCELLED: "badge-danger",
      NO_SHOW: "badge-secondary",
    };
    return map[s] ?? "badge-secondary";
  }

  clientLabel(c: Appointment): string {
    if (c.client) {
      const n = [c.client.firstName, c.client.lastName]
        .filter(Boolean)
        .join(" ");
      return c.client.companyName || n || c.clientName || "—";
    }
    return c.clientName || "—";
  }

  vehicleLabel(c: Appointment): string {
    if (!c.vehicle) return "—";
    const parts = [c.vehicle.brand, c.vehicle.model].filter(Boolean).join(" ");
    return c.vehicle.plate ? `${parts} · ${c.vehicle.plate}` : parts || "—";
  }

  mechanicLabel(c: Appointment): string {
    return c.mechanic
      ? `${c.mechanic.firstName} ${c.mechanic.lastName}`
      : "Sin asignar";
  }

  hourLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  vehicleOptionLabel(v: CustomerVehicle): string {
    const anyV = v as unknown as Record<string, unknown>;
    const brand = (anyV["brand"] ?? anyV["make"] ?? "") as string;
    const model = (anyV["model"] ?? "") as string;
    const plate = (anyV["plate"] ?? "") as string;
    const base = [brand, model].filter(Boolean).join(" ");
    return plate ? `${base} · ${plate}` : base || "Vehículo";
  }
}
