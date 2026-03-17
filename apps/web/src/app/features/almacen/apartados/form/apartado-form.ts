import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AlmacenService } from "../../almacen.service";
import { InventarioUnidadesService } from "../../../inventario-unidades/inventario-unidades.service";
import { ClientesService } from "../../../clientes/clientes.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { CreateUnitReservationDto } from "../../models/unit-reservation.model";
import { CatalogUnit, CatalogUnitStatus } from "../../../inventario-unidades/models/catalog-unit.model";
import { ClientListItem } from "../../../clientes/models/client.model";

@Component({
  selector: "app-apartado-form",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./apartado-form.html",
  styleUrls: ["./apartado-form.scss"],
})
export class ApartadoForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private almacenService = inject(AlmacenService);
  private inventarioService = inject(InventarioUnidadesService);
  private clientesService = inject(ClientesService);
  private branchesService = inject(BranchesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  units = signal<CatalogUnit[]>([]);
  clients = signal<ClientListItem[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  branchFilter = signal<string>("");
  unitsLoading = signal(false);
  clientsLoading = signal(false);

  ngOnInit(): void {
    this.form = this.fb.group({
      catalogUnitId: ["", Validators.required],
      clientId: ["", Validators.required],
      advanceAmount: [0, [Validators.required, Validators.min(0)]],
      notes: [""],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.loadUnits();
    this.loadClients();
  }

  onBranchChange(branchId: string): void {
    this.branchFilter.set(branchId);
    this.form.patchValue({ catalogUnitId: "" });
    this.loadUnits(branchId || undefined);
  }

  private loadUnits(branchId?: string): void {
    this.unitsLoading.set(true);
    this.inventarioService
      .getUnits({
        status: CatalogUnitStatus.AVAILABLE,
        branchId,
        limit: 500,
      })
      .subscribe({
        next: (res) => {
          this.units.set(res.data);
          this.unitsLoading.set(false);
        },
        error: () => this.unitsLoading.set(false),
      });
  }

  private loadClients(): void {
    this.clientsLoading.set(true);
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => {
        this.clients.set(res.data);
        this.clientsLoading.set(false);
      },
      error: () => this.clientsLoading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateUnitReservationDto = {
      catalogUnitId: raw.catalogUnitId,
      clientId: raw.clientId,
      advanceAmount: Number(raw.advanceAmount),
      notes: raw.notes || undefined,
    };

    this.loading.set(true);
    this.almacenService.createUnitReservation(dto).subscribe({
      next: (reservation) => {
        this.toastr.success("Apartado creado");
        this.router.navigate(["/almacen/apartados", reservation.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al crear apartado");
      },
    });
  }

  getUnitLabel(u: CatalogUnit): string {
    return `${u.year} ${u.brand} ${u.model} — ${u.serialNumber}`;
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }
}
