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
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

import { InventarioUnidadesService } from "../../inventario-unidades.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { CatalogoService } from "../../../catalogo/catalogo.service";
import { VehicleTypesService } from "../../../catalogo/vehicle-types.service";
import { VehicleCategoriesService } from "../../../catalogo/vehicle-categories.service";
import { GlobalBrandsService } from "../../../catalogo/global-brands.service";
import { VehicleModelsService } from "../../../catalogo/vehicle-models.service";
import { VehicleVersionsService } from "../../../catalogo/vehicle-versions.service";
import { VehicleColorsService } from "../../../catalogo/vehicle-colors.service";
import {
  CreateCatalogUnitDto,
  CatalogUnitVehicleType,
  CatalogUnitCondition,
} from "../../models/catalog-unit.model";
import { UnitLocation } from "../../models/unit-location.model";
import type { GlobalModel } from "../../../catalogo/models/modelo-global.model";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { GlobalModelSelector } from "./global-model-selector/global-model-selector";
import { ModeloQuickDialog } from "./modelo-quick-dialog/modelo-quick-dialog";
import { VersionQuickDialog } from "./version-quick-dialog/version-quick-dialog";
import { ColorQuickDialog } from "./color-quick-dialog/color-quick-dialog";

@Component({
  selector: "app-unidad-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    GlobalModelSelector,
  ],
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
  private vehicleCategoriesService = inject(VehicleCategoriesService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleModelsService = inject(VehicleModelsService);
  private vehicleVersionsService = inject(VehicleVersionsService);
  private vehicleColorsService = inject(VehicleColorsService);
  private toastr = inject(ToastrService);
  private modal = inject(NgbModal);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  unidadId = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  ubicaciones = signal<UnitLocation[]>([]);
  brands = signal<string[]>([]);
  vehicleCategories = signal<{ id: string; code: string; label: string }[]>([]);
  vehicleTypes = signal<{ value: string; label: string }[]>([]);
  selectedGlobalModel = signal<GlobalModel | null>(null);
  globalBrands = signal<{ id: string; name: string }[]>([]);
  vehicleTypesWithId = signal<{ id: string; code: string; label: string }[]>([]);
  versionId = signal<string>("");
  versions = signal<{ id: string; name: string }[]>([]);
  exteriorColors = signal<{ id: string; name: string }[]>([]);
  interiorColors = signal<{ id: string; name: string }[]>([]);

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

    this.vehicleCategoriesService.getAll().subscribe({
      next: (cats) =>
        this.vehicleCategories.set(
          cats.map((c) => ({ id: c.id, code: c.code, label: c.label }))
        ),
    });

    this.globalBrandsService.getAll().subscribe({
      next: (brands) =>
        this.globalBrands.set(
          brands.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))
        ),
    });

    this.form = this.fb.group({
      branchId: ["", Validators.required],
      globalModelId: [null as string | null, Validators.required],
      vehicleCategoryId: ["", Validators.required],
      vehicleType: ["", Validators.required],
      conditionType: [CatalogUnitCondition.NEW, Validators.required],
      brand: ["", [Validators.maxLength(100)]],
      model: ["", [Validators.maxLength(200)]],
      year: [this.currentYear, [Validators.min(1900)]],
      version: [""],
      versionId: ["", Validators.required],
      color: [""],
      exteriorColorId: [null as string | null, Validators.required],
      interiorColor: [""],
      interiorColorId: [null as string | null],
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

    this.form.get("vehicleCategoryId")?.valueChanges.subscribe((categoryId) => {
      this.form.patchValue({ vehicleType: "" });
      this.vehicleTypes.set([]);
      this.vehicleTypesWithId.set([]);
      if (categoryId) {
        this.vehicleTypesService.getAll(categoryId).subscribe({
          next: (types) => {
            this.vehicleTypes.set(types.map((t) => ({ value: t.code, label: t.label })));
            this.vehicleTypesWithId.set(
              types.map((t) => ({ id: t.id, code: t.code, label: t.label }))
            );
          },
        });
      }
    });
    this.form.get("vehicleType")?.valueChanges.subscribe(() => {
      this.form.patchValue({ brand: "", model: "", version: "", globalModelId: null });
      this.selectedGlobalModel.set(null);
      this.loadBrands();
    });
    this.form.get("brand")?.valueChanges.subscribe(() => {
      this.form.patchValue({ model: "", version: "", versionId: "", globalModelId: null });
      this.selectedGlobalModel.set(null);
      this.versionId.set("");
      this.versions.set([]);
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
    });

    if (id) {
      this.loadUnidad(id);
    }
  }

  private loadBrands(): void {
    const vt = this.form.get("vehicleType")?.value || "CAR";
    this.catalogoService.getBrands(vt).subscribe({ next: (b) => this.brands.set(b) });
  }

  onModelSelected(model: GlobalModel | null): void {
    this.selectedGlobalModel.set(model);
    if (model) {
      this.form.patchValue(
        {
          globalModelId: model.id,
          brand: model.brand?.name ?? "",
          model: model.model,
          version: model.version ?? "",
          year: model.year,
        },
        { emitEvent: false }
      );
      this.loadVersionAndColors(model);
    } else {
      this.form.patchValue(
        { globalModelId: null, model: "", version: "", versionId: "" },
        { emitEvent: false }
      );
      this.versionId.set("");
      this.versions.set([]);
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
    }
  }

  private loadVersionAndColors(
    model: GlobalModel,
    colorToMatch?: string,
    interiorColorToMatch?: string
  ): void {
    const brandId = model.brandId ?? model.brand?.id;
    if (!brandId) return;

    this.vehicleModelsService.findByBrandId(brandId).subscribe({
      next: (models) => {
        const vm = models.find((m) => m.name.toLowerCase() === model.model?.toLowerCase());
        if (!vm) {
          this.versionId.set("");
          this.versions.set([]);
          this.exteriorColors.set([]);
          this.interiorColors.set([]);
          return;
        }

        this.vehicleVersionsService
          .findByBrandModelYear(brandId, vm.id, model.year)
          .subscribe({
            next: (vers) => {
              this.versions.set(vers.map((v) => ({ id: v.id, name: v.name })));
              const vv = vers.find(
                (v) => v.name.toLowerCase() === (model.version ?? "").toLowerCase()
              );
              if (vv) {
                this.versionId.set(vv.id);
                this.form.patchValue({ versionId: vv.id }, { emitEvent: false });
                this.loadColors(vv.id, colorToMatch, interiorColorToMatch);
              } else {
                this.versionId.set("");
                this.exteriorColors.set([]);
                this.interiorColors.set([]);
              }
            },
          });
      },
    });
  }

  private loadColors(versionId: string, colorToMatch?: string, interiorColorToMatch?: string): void {
    this.vehicleColorsService.findByVersion(versionId, "EXTERIOR").subscribe({
      next: (c) => {
        const list = c.map((x) => ({ id: x.id, name: x.name }));
        this.exteriorColors.set(list);
        if (colorToMatch && !this.form.get("exteriorColorId")?.value) {
          const match = list.find((x) => x.name.toLowerCase() === colorToMatch.toLowerCase());
          if (match) this.form.patchValue({ exteriorColorId: match.id, color: match.name }, { emitEvent: false });
        }
      },
    });
    this.vehicleColorsService.findByVersion(versionId, "INTERIOR").subscribe({
      next: (c) => {
        const list = c.map((x) => ({ id: x.id, name: x.name }));
        this.interiorColors.set(list);
        if (interiorColorToMatch && !this.form.get("interiorColorId")?.value) {
          const match = list.find((x) => x.name.toLowerCase() === interiorColorToMatch.toLowerCase());
          if (match) this.form.patchValue({ interiorColorId: match.id, interiorColor: match.name }, { emitEvent: false });
        }
      },
    });
  }

  onVersionSelected(versionId: string | null): void {
    const id = versionId || "";
    this.versionId.set(id);
    this.form.patchValue({ versionId: id }, { emitEvent: false });
    if (id) {
      const v = this.versions().find((x) => x.id === id);
      if (v) this.form.patchValue({ version: v.name }, { emitEvent: false });
      this.loadColors(id);
    } else {
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
    }
  }

  onExteriorColorSelected(colorId: string | null): void {
    const id = colorId || null;
    const c = id ? this.exteriorColors().find((x) => x.id === id) : null;
    this.form.patchValue({ color: c?.name ?? "", exteriorColorId: id }, { emitEvent: false });
  }

  onInteriorColorSelected(colorId: string | null): void {
    const id = colorId || null;
    const c = id ? this.interiorColors().find((x) => x.id === id) : null;
    this.form.patchValue({ interiorColor: c?.name ?? "", interiorColorId: id }, { emitEvent: false });
  }

  openCreateVersionDialog(): void {
    const model = this.selectedGlobalModel();
    if (!model?.brandId || !model.model || !model.year) {
      this.toastr.warning("Primero selecciona una variante");
      return;
    }
    this.vehicleModelsService.findByBrandId(model.brandId).subscribe({
      next: (models) => {
        const vm = models.find((m) => m.name.toLowerCase() === model.model?.toLowerCase());
        if (!vm) {
          this.toastr.warning("Variante no encontrada en catálogo");
          return;
        }
        const ref = this.modal.open(VersionQuickDialog, { size: "sm", centered: true });
        (ref.componentInstance as VersionQuickDialog).brandId = model.brandId;
        (ref.componentInstance as VersionQuickDialog).modelId = vm.id;
        (ref.componentInstance as VersionQuickDialog).year = model.year;
        ref.result.then(
          (v) => {
            this.versions.update((list) => [...list, { id: v.id, name: v.name }]);
            this.form.patchValue({ versionId: v.id, version: v.name });
            this.versionId.set(v.id);
            this.loadColors(v.id);
            this.toastr.success("Versión creada");
          },
          () => {}
        );
      },
    });
  }

  openCreateColorDialog(type: "EXTERIOR" | "INTERIOR"): void {
    const model = this.selectedGlobalModel();
    const vid = this.versionId();
    if (!model?.brandId || !vid) {
      this.toastr.warning("Primero selecciona variante y versión");
      return;
    }
    this.vehicleModelsService.findByBrandId(model.brandId).subscribe({
      next: (models) => {
        const vm = models.find((m) => m.name.toLowerCase() === model.model?.toLowerCase());
        if (!vm) return;

        const ref = this.modal.open(ColorQuickDialog, { size: "sm", centered: true });
        (ref.componentInstance as ColorQuickDialog).brandId = model.brandId;
        (ref.componentInstance as ColorQuickDialog).modelId = vm.id;
        (ref.componentInstance as ColorQuickDialog).versionId = vid;
        (ref.componentInstance as ColorQuickDialog).colorType = type;
        ref.result.then(
          (c) => {
            if (type === "EXTERIOR") {
              this.exteriorColors.update((list) => [...list, { id: c.id, name: c.name }]);
              this.form.patchValue({ color: c.name, exteriorColorId: c.id });
            } else {
              this.interiorColors.update((list) => [...list, { id: c.id, name: c.name }]);
              this.form.patchValue({ interiorColor: c.name, interiorColorId: c.id });
            }
            this.toastr.success("Color creado");
          },
          () => {}
        );
      },
    });
  }

  openCreateModelDialog(): void {
    const brandName = this.form.get("brand")?.value;
    const vehicleTypeCode = this.form.get("vehicleType")?.value || "CAR";
    if (!brandName?.trim()) {
      this.toastr.warning("Primero selecciona una marca");
      return;
    }
    const brand = this.globalBrands().find(
      (b) => b.name.toLowerCase() === brandName.trim().toLowerCase()
    );
    const vt = this.vehicleTypesWithId().find(
      (t) => t.code.toLowerCase() === vehicleTypeCode.toLowerCase()
    );
    if (!brand || !vt) {
      this.toastr.warning("Marca o tipo de vehículo no encontrado");
      return;
    }
    const ref = this.modal.open(ModeloQuickDialog, {
      size: "md",
      centered: true,
    });
    (ref.componentInstance as ModeloQuickDialog).brandId = brand.id;
    (ref.componentInstance as ModeloQuickDialog).vehicleTypeId = vt.id;
    (ref.componentInstance as ModeloQuickDialog).brandName = brand.name;
    ref.result.then(
      (created: GlobalModel) => {
        this.onModelSelected(created);
        this.toastr.success("Variante creada");
      },
      () => {}
    );
  }

  getModelInitialDisplay(): string {
    const brand = this.form.get("brand")?.value;
    const model = this.form.get("model")?.value;
    const version = this.form.get("version")?.value;
    if (!brand || !model) return "";
    return version ? `${brand} ${model} ${version}` : `${brand} ${model}`;
  }

  private loadUnidad(id: string): void {
    this.loading.set(true);
    this.inventarioService.getUnit(id).subscribe({
      next: (u) => {
        this.vehicleTypesService.getAll().subscribe({
          next: (allTypes) => {
            const match = allTypes.find(
              (t) => t.code.toLowerCase() === (u.vehicleType || "").toLowerCase()
            );
            const vehicleCategoryId = match?.categoryId ?? "";
            this.form.patchValue(
              {
                branchId: u.branchId,
                globalModelId: u.globalModelId,
                vehicleCategoryId,
                vehicleType: u.vehicleType,
                brand: u.brand,
                model: u.model,
                year: u.year,
                version: u.version ?? "",
                color: u.color,
                interiorColor: (u as { interiorColor?: string }).interiorColor ?? "",
                exteriorColorId: (u as { exteriorColorId?: string }).exteriorColorId ?? null,
                interiorColorId: (u as { interiorColorId?: string }).interiorColorId ?? null,
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
            if (match) {
              this.vehicleTypes.set([{ value: match.code, label: match.label }]);
              this.vehicleTypesWithId.set([{ id: match.id, code: match.code, label: match.label }]);
            }
            this.catalogoService.getBrands(u.vehicleType || "CAR").subscribe({
          next: (b) => {
            const list = [...b];
            if (u.brand && !list.includes(u.brand)) list.push(u.brand);
            this.brands.set(list.sort());
          },
        });
            const colorToMatch = u.color;
            const interiorColorToMatch = (u as { interiorColor?: string }).interiorColor;
            if (u.globalModelId) {
              this.catalogoService.getById(u.globalModelId).subscribe({
                next: (m) => {
                  this.selectedGlobalModel.set(m);
                  this.loadVersionAndColors(m, colorToMatch, interiorColorToMatch);
                },
                error: () => this.selectedGlobalModel.set(null),
              });
            } else {
              const brand = this.globalBrands().find(
                (b) => b.name.toLowerCase() === (u.brand || "").toLowerCase()
              );
              if (brand) {
                const mockModel = {
                  brandId: brand.id,
                  brand: { id: brand.id, name: brand.name },
                  model: u.model,
                  version: u.version ?? "",
                  year: u.year,
                } as GlobalModel;
                this.loadVersionAndColors(mockModel, colorToMatch, interiorColorToMatch);
              }
            }
            this.form.get("branchId")?.disable();
            this.inventarioService.getLocations(u.branchId).subscribe({
              next: (locs) => this.ubicaciones.set(locs),
            });
          },
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
      globalModelId: raw.globalModelId,
      vehicleType: raw.vehicleType as CatalogUnitVehicleType,
      conditionType: raw.conditionType as CatalogUnitCondition,
      brand: raw.brand,
      model: raw.model,
      year: Number(raw.year),
      version: raw.version || undefined,
      color: raw.color,
      interiorColor: raw.interiorColor || undefined,
      exteriorColorId: raw.exteriorColorId,
      interiorColorId: raw.interiorColorId || undefined,
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
