import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { forkJoin } from "rxjs";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NgbModal, NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { CatalogoService } from "../../catalogo.service";
import { GlobalBrandsService } from "../../global-brands.service";
import { VehicleCategoriesService } from "../../vehicle-categories.service";
import { VehicleTypesService } from "../../vehicle-types.service";
import { CombustionTypesService } from "../../combustion-types.service";
import { VehicleModelsService } from "../../vehicle-models.service";
import { VehicleVersionsService } from "../../vehicle-versions.service";
import { VehicleColorsService } from "../../vehicle-colors.service";
import {
  VehicleType,
  VehicleCategory,
  CombustionType,
  CreateGlobalModelDto,
} from "../../models/modelo-global.model";
import { VehicleModelQuickDialog } from "./vehicle-model-quick-dialog/vehicle-model-quick-dialog";
import { VersionQuickDialog } from "../../../inventario-unidades/unidades/form/version-quick-dialog/version-quick-dialog";
import { ColorQuickDialog } from "../../../inventario-unidades/unidades/form/color-quick-dialog/color-quick-dialog";

@Component({
  selector: "app-variante-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbModule],
  templateUrl: "./variante-form.html",
  styleUrls: ["./variante-form.scss"],
})
export class VarianteForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private catalogoService = inject(CatalogoService);
  private globalBrandsService = inject(GlobalBrandsService);
  private vehicleCategoriesService = inject(VehicleCategoriesService);
  private vehicleTypesService = inject(VehicleTypesService);
  private combustionTypesService = inject(CombustionTypesService);
  private vehicleModelsService = inject(VehicleModelsService);
  private vehicleVersionsService = inject(VehicleVersionsService);
  private vehicleColorsService = inject(VehicleColorsService);
  private toastr = inject(ToastrService);
  private modal = inject(NgbModal);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  modelId = signal<string | null>(null);
  brands = signal<{ id: string; name: string }[]>([]);
  vehicleCategories = signal<VehicleCategory[]>([]);
  vehicleTypes = signal<VehicleType[]>([]);
  combustionTypes = signal<CombustionType[]>([]);
  selectedCategoryId = signal<string>("");
  vehicleModels = signal<{ id: string; name: string }[]>([]);
  vehicleVersions = signal<{ id: string; name: string }[]>([]);
  selectedVehicleModelId = signal<string>("");
  exteriorColors = signal<{ id: string; name: string }[]>([]);
  interiorColors = signal<{ id: string; name: string }[]>([]);

  isMoto = computed(() => {
    const catId = this.selectedCategoryId();
    if (!catId) return false;
    return this.vehicleCategories().some((c) => c.id === catId && c.code === "MOTO");
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    this.isEdit.set(!!id);
    this.modelId.set(id ?? null);

    this.form = this.fb.group({
      brandId: ["", Validators.required],
      vehicleCategoryId: ["", Validators.required],
      vehicleTypeId: ["", Validators.required],
      modelId: [""],
      model: ["", [Validators.required, Validators.maxLength(200)]],
      versionId: [""],
      version: ["", [Validators.required, Validators.maxLength(100)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
      combustionTypeId: [null as string | null],
      displacement: [null as number | null, [Validators.min(1)]],
      doorCount: [null as number | null, [Validators.min(1)]],
      passengerCount: [null as number | null, [Validators.min(1)]],
      exteriorColorId: [null as string | null],
      interiorColorId: [null as string | null],
      isActive: [true],
    });

    this.vehicleCategoriesService.getAll().subscribe({
      next: (cats) => this.vehicleCategories.set(cats),
    });
    this.form.get("vehicleCategoryId")?.valueChanges.subscribe((catId) => {
      this.selectedCategoryId.set(catId || "");
      const isMoto = this.vehicleCategories().some((c) => c.id === catId && c.code === "MOTO");
      this.form.patchValue(
        { vehicleTypeId: "", displacement: isMoto ? this.form.get("displacement")?.value : null },
        { emitEvent: false },
      );
      if (catId) {
        this.vehicleTypesService.getAll(catId).subscribe({
          next: (types) => this.vehicleTypes.set(types),
        });
      } else {
        this.vehicleTypes.set([]);
      }
    });

    this.combustionTypesService.getAll().subscribe({
      next: (types) => this.combustionTypes.set(types),
    });
    this.globalBrandsService.getAll().subscribe({
      next: (brands) =>
        this.brands.set(
          brands
            .filter((b) => b.isActive)
            .map((b) => ({ id: b.id, name: b.name })),
        ),
    });

    this.form.get("brandId")?.valueChanges.subscribe((brandId) => {
      this.vehicleModels.set([]);
      this.vehicleVersions.set([]);
      this.selectedVehicleModelId.set("");
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
      this.form.patchValue({ modelId: "", model: "", versionId: "", version: "" }, { emitEvent: false });
      if (brandId) {
        this.vehicleModelsService.findByBrandId(brandId).subscribe({
          next: (models) =>
            this.vehicleModels.set(models.map((m) => ({ id: m.id, name: m.name }))),
        });
      }
    });

    this.form.get("year")?.valueChanges.subscribe(() => this.loadVersions());

    if (id) {
      forkJoin({
        model: this.catalogoService.getById(id),
        categories: this.vehicleCategoriesService.getAll(),
        brands: this.globalBrandsService.getAll(),
        combustionTypes: this.combustionTypesService.getAll(),
      }).subscribe({
        next: ({ model: m, categories, brands, combustionTypes }) => {
          this.vehicleCategories.set(categories);
          this.brands.set(
            brands.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))
          );
          this.combustionTypes.set(combustionTypes);

          const vt = m.vehicleType as (VehicleType & { categoryId?: string; category_id?: string; category?: { id?: string } }) | undefined;
          let vehicleCategoryId =
            vt?.categoryId ?? vt?.category_id ?? vt?.category?.id ?? "";
          if (!vehicleCategoryId && m.vehicleTypeId) {
            this.vehicleTypesService.getAll().subscribe({
              next: (allTypes) => {
                const match = allTypes.find((t) => t.id === m.vehicleTypeId);
                vehicleCategoryId = match?.categoryId ?? "";
                this.vehicleTypes.set(vehicleCategoryId ? allTypes.filter((t) => t.categoryId === vehicleCategoryId) : allTypes);
                this.patchFormForEdit(m, vehicleCategoryId);
              },
            });
          } else {
            this.patchFormForEdit(m, vehicleCategoryId);
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || "Error al cargar variante");
          this.router.navigate(["/catalog"]);
        },
      });
    }
  }

  private patchFormForEdit(
    m: import("../../models/modelo-global.model").GlobalModel,
    vehicleCategoryId: string
  ): void {
    this.selectedCategoryId.set(vehicleCategoryId || "");
    this.form.patchValue(
      {
        brandId: m.brandId,
        vehicleCategoryId: vehicleCategoryId || "",
        vehicleTypeId: m.vehicleTypeId,
        model: m.model,
        version: m.version ?? "",
        year: m.year,
        combustionTypeId: m.combustionTypeId,
        displacement: m.displacement,
        doorCount: m.doorCount,
        passengerCount: (m as { passengerCount?: number }).passengerCount ?? null,
        exteriorColorId: m.exteriorColorId ?? null,
        interiorColorId: m.interiorColorId ?? null,
        isActive: m.isActive,
      },
      { emitEvent: false },
    );
    if (vehicleCategoryId) {
      this.vehicleTypesService.getAll(vehicleCategoryId).subscribe({
        next: (types) => this.vehicleTypes.set(types),
      });
    } else {
      this.vehicleTypesService.getAll().subscribe({
        next: (types) => this.vehicleTypes.set(types),
      });
    }
    if (m.brandId && m.model?.trim() && m.version?.trim()) {
      this.vehicleVersionsService
        .findByContext(m.brandId, m.model.trim(), m.year, m.version.trim())
        .subscribe({
          next: (vv) => {
            if (vv) {
              this.selectedVehicleModelId.set(vv.modelId);
              this.form.patchValue({ modelId: vv.modelId }, { emitEvent: false });
              this.vehicleModelsService.findByBrandId(m.brandId).subscribe({
                next: (models) =>
                  this.vehicleModels.set(models.map((x) => ({ id: x.id, name: x.name }))),
              });
              this.vehicleVersionsService
                .findByBrandModelYear(m.brandId, vv.modelId, m.year)
                .subscribe({
                  next: (vers) => {
                    this.vehicleVersions.set(vers.map((v) => ({ id: v.id, name: v.name })));
                    this.form.patchValue({ versionId: vv.id }, { emitEvent: false });
                    this.loadColors(vv.id);
                  },
                });
            } else {
              this.loadVersionsByModelName(m);
            }
          },
        });
    } else if (m.brandId) {
      this.loadVersionsByModelName(m);
    }
  }

  private loadVersionsByModelName(m: import("../../models/modelo-global.model").GlobalModel): void {
    this.vehicleModelsService.findByBrandId(m.brandId!).subscribe({
      next: (models) => {
        this.vehicleModels.set(models.map((x) => ({ id: x.id, name: x.name })));
        const vm = models.find((x) => x.name.toLowerCase() === (m.model ?? "").toLowerCase());
        if (vm) {
          this.selectedVehicleModelId.set(vm.id);
          this.form.patchValue({ modelId: vm.id }, { emitEvent: false });
          this.loadVersions(m.version ?? undefined);
        }
      },
    });
  }

  private loadVersions(versionToSelect?: string): void {
    const brandId = this.form.get("brandId")?.value;
    const modelId = this.selectedVehicleModelId();
    const year = this.form.get("year")?.value;
    if (!brandId || !modelId || !year) {
      this.vehicleVersions.set([]);
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
      return;
    }
    this.vehicleVersionsService
      .findByBrandModelYear(brandId, modelId, Number(year))
      .subscribe({
        next: (vers) => {
          const list = vers.map((v) => ({ id: v.id, name: v.name }));
          this.vehicleVersions.set(list);
          if (versionToSelect) {
            const v = list.find((x) => x.name.toLowerCase() === versionToSelect.toLowerCase());
            if (v) {
              this.form.patchValue({ versionId: v.id }, { emitEvent: false });
              this.loadColors(v.id);
            }
          }
        },
      });
  }

  onModelSelected(value: string): void {
    if (value === "__new__") {
      this.openCreateModelDialog();
      return;
    }
    const model = this.vehicleModels().find((m) => m.id === value);
    if (model) {
      this.selectedVehicleModelId.set(model.id);
      this.form.patchValue({ modelId: model.id, model: model.name }, { emitEvent: false });
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
      this.loadVersions();
    }
  }

  onVersionSelected(value: string): void {
    if (value === "__new__") {
      this.openCreateVersionDialog();
      return;
    }
    const version = this.vehicleVersions().find((v) => v.id === value);
    if (version) {
      this.form.patchValue(
        { versionId: version.id, version: version.name, exteriorColorId: null, interiorColorId: null },
        { emitEvent: false }
      );
      this.loadColors(version.id);
    } else {
      this.exteriorColors.set([]);
      this.interiorColors.set([]);
      this.form.patchValue({ exteriorColorId: null, interiorColorId: null }, { emitEvent: false });
    }
  }

  private loadColors(versionId: string): void {
    this.vehicleColorsService.findByVersion(versionId, "EXTERIOR").subscribe({
      next: (c) => this.exteriorColors.set(c.map((x) => ({ id: x.id, name: x.name }))),
    });
    this.vehicleColorsService.findByVersion(versionId, "INTERIOR").subscribe({
      next: (c) => this.interiorColors.set(c.map((x) => ({ id: x.id, name: x.name }))),
    });
  }

  openCreateColorDialog(colorType: "EXTERIOR" | "INTERIOR"): void {
    const brandId = this.form.get("brandId")?.value;
    const modelId = this.selectedVehicleModelId();
    const versionId = this.form.get("versionId")?.value;
    if (!brandId || !modelId || !versionId) {
      this.toastr.warning("Primero selecciona marca, modelo y versión");
      return;
    }
    const ref = this.modal.open(ColorQuickDialog, { size: "sm", centered: true });
    (ref.componentInstance as ColorQuickDialog).brandId = brandId;
    (ref.componentInstance as ColorQuickDialog).modelId = modelId;
    (ref.componentInstance as ColorQuickDialog).versionId = versionId;
    (ref.componentInstance as ColorQuickDialog).colorType = colorType;
    ref.result.then(
        (c) => {
          if (colorType === "EXTERIOR") {
            this.exteriorColors.update((list) => [...list, { id: c.id, name: c.name }]);
            this.form.patchValue({ exteriorColorId: c.id }, { emitEvent: false });
          } else {
            this.interiorColors.update((list) => [...list, { id: c.id, name: c.name }]);
            this.form.patchValue({ interiorColorId: c.id }, { emitEvent: false });
          }
          this.toastr.success("Color creado");
        },
      () => {}
    );
  }

  openCreateModelDialog(): void {
    const brandId = this.form.get("brandId")?.value;
    if (!brandId) {
      this.toastr.warning("Primero selecciona una marca");
      return;
    }
    const ref = this.modal.open(VehicleModelQuickDialog, { size: "sm", centered: true });
    (ref.componentInstance as VehicleModelQuickDialog).brandId = brandId;
    ref.result.then(
      (created) => {
        this.vehicleModels.update((list) => [...list, { id: created.id, name: created.name }]);
        this.selectedVehicleModelId.set(created.id);
        this.form.patchValue({ modelId: created.id, model: created.name });
        this.loadVersions();
        this.toastr.success("Variante creada");
      },
      () => {}
    );
  }

  openCreateVersionDialog(): void {
    const brandId = this.form.get("brandId")?.value;
    const modelId = this.selectedVehicleModelId();
    const year = this.form.get("year")?.value;
    if (!brandId || !modelId || !year) {
      this.toastr.warning("Primero selecciona marca, modelo y año");
      return;
    }
    const ref = this.modal.open(VersionQuickDialog, { size: "sm", centered: true });
    (ref.componentInstance as VersionQuickDialog).brandId = brandId;
    (ref.componentInstance as VersionQuickDialog).modelId = modelId;
    (ref.componentInstance as VersionQuickDialog).year = Number(year);
    ref.result.then(
      (created) => {
        this.vehicleVersions.update((list) => [...list, { id: created.id, name: created.name }]);
        this.form.patchValue({ versionId: created.id, version: created.name });
        this.loadColors(created.id);
        this.toastr.success("Versión creada");
      },
      () => {}
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreateGlobalModelDto = {
      brandId: raw.brandId,
      vehicleTypeId: raw.vehicleTypeId,
      model: raw.model.trim(),
      version: raw.version?.trim(),
      year: Number(raw.year),
      combustionTypeId: raw.combustionTypeId || undefined,
      displacement: raw.displacement ? Number(raw.displacement) : undefined,
      doorCount: raw.doorCount ? Number(raw.doorCount) : undefined,
      passengerCount: raw.passengerCount ? Number(raw.passengerCount) : undefined,
      exteriorColorId: raw.exteriorColorId || undefined,
      interiorColorId: raw.interiorColorId || undefined,
      isActive: raw.isActive,
    };

    this.loading.set(true);
    const id = this.modelId();

    if (id) {
      this.catalogoService.update(id, dto).subscribe({
        next: () => {
          this.toastr.success("Variante actualizada");
          this.router.navigate(["/catalog"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.catalogoService.create(dto).subscribe({
        next: () => {
          this.toastr.success("Variante creada");
          this.router.navigate(["/catalog"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
