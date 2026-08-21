import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ToastrService } from "ngx-toastr";

import { TallerService } from "../../taller.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { ClientesService } from "../../../clientes/clientes.service";
import { CreateServiceOrderDto } from "../../models/service-order.model";
import {
  ClientListItem,
  CustomerVehicle,
} from "../../../clientes/models/client.model";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { ClienteQuickDialog } from "../dialogs/cliente-quick-dialog/cliente-quick-dialog";
import { VehiculoQuickDialog } from "../dialogs/vehiculo-quick-dialog/vehiculo-quick-dialog";

@Component({
  selector: "app-orden-servicio-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbModule],
  templateUrl: "./orden-servicio-form.html",
  styleUrls: ["./orden-servicio-form.scss"],
})
export class OrdenServicioForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private tallerService = inject(TallerService);
  private branchesService = inject(BranchesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);
  private modal = inject(NgbModal);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  clients = signal<ClientListItem[]>([]);
  vehicles = signal<CustomerVehicle[]>([]);
  mechanics = signal<{ id: string; firstName: string; lastName: string }[]>([]);
  vehiclesLoading = signal(false);

  ngOnInit(): void {
    this.form = this.fb.group({
      ownerId: ["", Validators.required],
      vehicleId: ["", Validators.required],
      branchId: ["", Validators.required],
      reportedFault: ["", [Validators.required, Validators.maxLength(2000)]],
      kmIn: [0, [Validators.required, Validators.min(0)]],
      mechanicId: [""],
      // Fecha promesa de entrega, capturada al recibir la unidad.
      promisedAt: [""],
      notes: [""],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });

    this.form.get("ownerId")?.valueChanges.subscribe((clientId) => {
      this.form.patchValue({ vehicleId: "" });
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
    });

    this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
      this.form.patchValue({ mechanicId: "" });
      if (branchId) {
        this.tallerService.getMechanicsForBranch(branchId).subscribe({
          next: (m) => this.mechanics.set(m),
        });
      } else {
        this.mechanics.set([]);
      }
    });
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }

  getVehicleLabel(v: CustomerVehicle): string {
    return `${v.year} ${v.make} ${v.model}` + (v.plate ? ` (${v.plate})` : "");
  }

  openNuevoCliente(): void {
    const ref = this.modal.open(ClienteQuickDialog, {
      size: "md",
      centered: true,
    });
    ref.result.then(
      (client: ClientListItem) => {
        this.clients.update((list) => [...list, client]);
        this.form.patchValue({ ownerId: client.id });
        this.toastr.success("Cliente creado");
      },
      () => {}
    );
  }

  openNuevaUnidad(): void {
    const clientId = this.form.get("ownerId")?.value;
    if (!clientId) {
      this.toastr.warning("Primero selecciona un cliente");
      return;
    }
    const ref = this.modal.open(VehiculoQuickDialog, {
      size: "md",
      centered: true,
    });
    (ref.componentInstance as VehiculoQuickDialog).clientId = clientId;
    ref.result.then(
      (vehicle: CustomerVehicle) => {
        this.vehicles.update((list) => [...list, vehicle]);
        this.form.patchValue({ vehicleId: vehicle.id });
        this.toastr.success("Vehículo registrado");
      },
      () => {}
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateServiceOrderDto = {
      ownerId: raw.ownerId,
      vehicleId: raw.vehicleId,
      branchId: raw.branchId,
      reportedFault: raw.reportedFault.trim(),
      kmIn: Number(raw.kmIn) || 0,
      mechanicId: raw.mechanicId || undefined,
      promisedAt: raw.promisedAt
        ? new Date(raw.promisedAt).toISOString()
        : undefined,
      notes: raw.notes?.trim() || undefined,
    };

    this.loading.set(true);
    this.tallerService.createServiceOrder(dto).subscribe({
      next: (order) => {
        this.toastr.success("Orden de servicio creada");
        this.router.navigate(["/workshop/service-orders", order.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al crear orden");
      },
    });
  }
}
