import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { GarantiasService } from "../garantias.service";
import {
  UnitSaleListItem,
  ServiceOrderListItem,
} from "../garantias.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { ClientesService } from "../../clientes/clientes.service";
import {
  CreateWarrantyDto,
  WarrantyType,
} from "../models/warranty.model";
import {
  ClientListItem,
  CustomerVehicle,
} from "../../clientes/models/client.model";

@Component({
  selector: "app-garantia-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./garantia-form.html",
  styleUrls: ["./garantia-form.scss"],
})
export class GarantiaForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private garantiasService = inject(GarantiasService);
  private branchesService = inject(BranchesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  clients = signal<ClientListItem[]>([]);
  vehicles = signal<CustomerVehicle[]>([]);
  unitSales = signal<UnitSaleListItem[]>([]);
  serviceOrders = signal<ServiceOrderListItem[]>([]);
  vehiclesLoading = signal(false);
  unitSalesLoading = signal(false);
  serviceOrdersLoading = signal(false);

  readonly typeOptions = [
    { value: WarrantyType.UNIT, label: "Unidad" },
    { value: WarrantyType.PART, label: "Refacción" },
    { value: WarrantyType.SERVICE, label: "Servicio" },
  ];

  readonly originOptions = [
    { value: "unitSale", label: "Venta de unidad" },
    { value: "serviceOrder", label: "Orden de servicio" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      clientId: ["", Validators.required],
      vehicleId: ["", Validators.required],
      branchId: ["", Validators.required],
      type: [WarrantyType.UNIT, Validators.required],
      originType: ["unitSale", Validators.required],
      unitSaleId: [""],
      serviceOrderId: [""],
      description: ["", [Validators.required, Validators.maxLength(2000)]],
      startDate: ["", Validators.required],
      endDate: ["", Validators.required],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });

    this.form.get("clientId")?.valueChanges.subscribe((clientId) => {
      this.form.patchValue({ vehicleId: "", unitSaleId: "", serviceOrderId: "" });
      this.vehicles.set([]);
      this.unitSales.set([]);
      this.serviceOrders.set([]);
      if (clientId) {
        this.vehiclesLoading.set(true);
        this.garantiasService.getVehiclesByClient(clientId).subscribe({
          next: (v) => {
            this.vehicles.set(v);
            this.vehiclesLoading.set(false);
          },
          error: () => this.vehiclesLoading.set(false),
        });
        this.loadOriginOptions(clientId);
      }
    });

    this.form.get("originType")?.valueChanges.subscribe(() => {
      this.form.patchValue({ unitSaleId: "", serviceOrderId: "" });
      const clientId = this.form.get("clientId")?.value;
      if (clientId) this.loadOriginOptions(clientId);
    });
  }

  private loadOriginOptions(clientId: string): void {
    const originType = this.form.get("originType")?.value;
    if (originType === "unitSale") {
      this.unitSalesLoading.set(true);
      this.garantiasService.getUnitSalesByClient(clientId).subscribe({
        next: (list) => {
          this.unitSales.set(list);
          this.serviceOrders.set([]);
          this.unitSalesLoading.set(false);
        },
        error: () => this.unitSalesLoading.set(false),
      });
    } else {
      this.serviceOrdersLoading.set(true);
      this.garantiasService.getServiceOrdersByClient(clientId).subscribe({
        next: (res) => {
          this.serviceOrders.set(res.data);
          this.unitSales.set([]);
          this.serviceOrdersLoading.set(false);
        },
        error: () => this.serviceOrdersLoading.set(false),
      });
    }
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }

  getVehicleLabel(v: CustomerVehicle): string {
    return `${v.year} ${v.make} ${v.model}` + (v.plate ? ` (${v.plate})` : "");
  }

  getUnitSaleLabel(u: UnitSaleListItem): string {
    const cu = (u as { catalogUnit?: { year: number; brand: string; model: string } }).catalogUnit;
    return cu ? `${u.folio} — ${cu.year} ${cu.brand} ${cu.model}` : u.folio;
  }

  getServiceOrderLabel(s: ServiceOrderListItem): string {
    const v = s.vehicle;
    return v ? `${s.folio} — ${v.year} ${v.make} ${v.model}` : s.folio;
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const hasUnitSale = !!raw.unitSaleId;
    const hasServiceOrder = !!raw.serviceOrderId;
    if (!hasUnitSale && !hasServiceOrder) {
      this.toastr.error("Debe seleccionar una venta de unidad o una orden de servicio");
      return;
    }

    const dto: CreateWarrantyDto = {
      clientId: raw.clientId,
      vehicleId: raw.vehicleId,
      branchId: raw.branchId,
      type: raw.type as WarrantyType,
      description: raw.description.trim(),
      startDate: raw.startDate,
      endDate: raw.endDate,
      unitSaleId: hasUnitSale ? raw.unitSaleId : undefined,
      serviceOrderId: hasServiceOrder ? raw.serviceOrderId : undefined,
    };

    this.loading.set(true);
    this.garantiasService.createWarranty(dto).subscribe({
      next: (warranty) => {
        this.toastr.success("Garantía creada");
        this.router.navigate(["/garantias", warranty.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al crear garantía");
      },
    });
  }
}
