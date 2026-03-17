import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { CatalogoService } from "../../../catalogo/catalogo.service";
import { VehicleTypesService } from "../../../catalogo/vehicle-types.service";
import {
  CreateCatalogUnitDto,
  CatalogUnitVehicleType,
  CatalogUnitCondition,
} from "../../models/catalog-unit.model";
import { UnitLocation } from "../../models/unit-location.model";

@Component({
  selector: "app-unidad-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./unidad-form.html",
  styleUrls: ["./unidad-form.scss"],
})
export class UnidadForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventarioService = inject(InventarioUnidadesService);
  private branchesService = inject(BranchesService);
  private catalogoService = inject(CatalogoService);
  private vehicleTypesService = inject(VehicleTypesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  unidadId = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  ubicaciones = signal<UnitLocation[]>([]);
  brands = signal<string[]>([]);
  models = signal<string[]>([]);
  vehicleTypes = signal<{ value: string; label: string }[]>([]);

  readonly conditionTypes = [
    { value: CatalogUnitCondition.NEW, label: "Nueva" },
    { value: CatalogUnitCondition.USED, label: "Seminueva" },
  ];

  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.unidadId.set(id);

    this.branchesService.getAll().subscribe({
      next: (res) => this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.form = this.fb.group({
      branchId: ["", Validators.required],
      globalModelId: [null as string | null],
      vehicleType: ["CAR", Validators.required],
      conditionType: [CatalogUnitCondition.NEW, Validators.required],
      brand: ["", [Validators.required, Validators.maxLength(100)]],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      year: [this.currentYear, [Validators.required, Validators.min(1900)]],
      version: ["", [Validators.maxLength(200)]],
      color: ["", [Validators.required, Validators.maxLength(100)]],
      serialNumber: ["", [Validators.required, Validators.maxLength(100)]],
      engineNumber: ["", [Validators.maxLength(100)]],
      displacement: [null as number | null, [Validators.min(0)]],
      doorCount: [null as number | null, [Validators.min(0)]],
      costPrice: [0, [Validators.required, Validators.min(0)]],
      listPrice: [0, [Validators.required, Validators.min(0)]],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      locationId: [null as string | null],
      notes: ["", [Validators.maxLength(500)]],
      acquisitionDate: [""],
    });

    this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
      if (branchId) {
        this.inventarioService.getLocations(branchId).subscribe({
          next: (locs) => this.ubicaciones.set(locs),
        });
      } else {
        this.ubicaciones.set([]);
      }
    });

    this.loadBrands();
    this.form.get("vehicleType")?.valueChanges.subscribe(() => {
      this.form.patchValue({ brand: "", model: "" });
      this.models.set([]);
      this.loadBrands();
    });
    this.form.get("brand")?.valueChanges.subscribe((brand) => {
      this.form.patchValue({ model: "" });
      if (brand) {
        this.catalogoService
          .getModels(this.form.get("vehicleType")?.value || "CAR", brand)
          .subscribe({ next: (m) => this.models.set(m) });
      } else {
        this.models.set([]);
      }
    });

    if (id) {
      this.loadUnidad(id);
    }
  }

  private loadBrands(): void {
    const vt = this.form.get("vehicleType")?.value || "CAR";
    this.catalogoService.getBrands(vt).subscribe({ next: (b) => this.brands.set(b) });
  }

  private loadUnidad(id: string): void {
    this.loading.set(true);
    this.inventarioService.getUnit(id).subscribe({
      next: (u) => {
        this.form.patchValue(
          {
            branchId: u.branchId,
            globalModelId: u.globalModelId,
            vehicleType: u.vehicleType,
            brand: u.brand,
            model: u.model,
            year: u.year,
            version: u.version ?? "",
            color: u.color,
            serialNumber: u.serialNumber,
            engineNumber: u.engineNumber ?? "",
            displacement: u.displacement,
            doorCount: u.doorCount,
            costPrice: u.costPrice,
            listPrice: u.listPrice,
            salePrice: u.salePrice,
            locationId: u.locationId,
            notes: u.notes ?? "",
            acquisitionDate: u.acquisitionDate ?? "",
          },
          { emitEvent: false },
        );
        this.catalogoService.getBrands(u.vehicleType || "CAR").subscribe({
          next: (b) => {
            const list = [...b];
            if (u.brand && !list.includes(u.brand)) list.push(u.brand);
            this.brands.set(list.sort());
          },
        });
        if (u.brand) {
          this.catalogoService
            .getModels(u.vehicleType || "CAR", u.brand)
            .subscribe({
              next: (m) => {
                const list = [...m];
                if (u.model && !list.includes(u.model)) list.push(u.model);
                this.models.set(list.sort());
              },
            });
        }
        this.form.get("branchId")?.disable();
        this.inventarioService.getLocations(u.branchId).subscribe({
          next: (locs) => this.ubicaciones.set(locs),
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Error al cargar unidad");
        this.router.navigate(["/units-inventory"]);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateCatalogUnitDto = {
      branchId: raw.branchId,
      globalModelId: raw.globalModelId || undefined,
      vehicleType: raw.vehicleType as CatalogUnitVehicleType,
      conditionType: raw.conditionType as CatalogUnitCondition,
      brand: raw.brand,
      model: raw.model,
      year: Number(raw.year),
      version: raw.version || undefined,
      color: raw.color,
      serialNumber: raw.serialNumber,
      engineNumber: raw.engineNumber || undefined,
      displacement: raw.displacement != null ? Number(raw.displacement) : undefined,
      doorCount: raw.doorCount != null ? Number(raw.doorCount) : undefined,
      costPrice: Number(raw.costPrice),
      listPrice: Number(raw.listPrice),
      salePrice: Number(raw.salePrice),
      locationId: raw.locationId || undefined,
      notes: raw.notes || undefined,
      acquisitionDate: raw.acquisitionDate || undefined,
    };

    this.loading.set(true);
    const id = this.unidadId();

    if (id) {
      this.inventarioService.updateUnit(id, dto).subscribe({
        next: () => {
          this.toastr.success("Unidad actualizada");
          this.router.navigate(["/units-inventory", id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.inventarioService.createUnit(dto).subscribe({
        next: (unidad) => {
          this.toastr.success("Unidad creada");
          this.router.navigate(["/units-inventory", unidad.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
