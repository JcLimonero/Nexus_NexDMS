import { Component, OnInit, OnDestroy, inject, signal, computed } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { Subject, takeUntil } from "rxjs";

import { VentasUnidadesService } from "../ventas-unidades.service";
import {
  CreateUnitSaleDto,
  UnitSaleFinancingType,
  UnitAccessory,
} from "../models/unit-sale.model";
import { InventarioUnidadesService } from "../../inventario-unidades/inventario-unidades.service";
import { ClientesService } from "../../clientes/clientes.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { CatalogUnit, CatalogUnitStatus } from "../../inventario-unidades/models/catalog-unit.model";
import { ClientListItem } from "../../clientes/models/client.model";
import {
  ConvenioResumen,
  FlotillasService,
} from "../../flotillas/flotillas.service";

@Component({
  selector: "app-venta-unidad-form",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./venta-unidad-form.html",
  styleUrls: ["./venta-unidad-form.scss"],
})
export class VentaUnidadForm implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private ventasService = inject(VentasUnidadesService);
  private inventarioService = inject(InventarioUnidadesService);
  private clientesService = inject(ClientesService);
  private branchesService = inject(BranchesService);
  private flotillasService = inject(FlotillasService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  units = signal<CatalogUnit[]>([]);
  clients = signal<ClientListItem[]>([]);
  branches = signal<{ id: string; name: string }[]>([]);
  compatibleAccessories = signal<UnitAccessory[]>([]);
  selectedUnit = signal<CatalogUnit | null>(null);
  unitsLoading = signal(false);
  clientsLoading = signal(false);
  accessoriesLoading = signal(false);
  saving = signal(false);
  branchFilter = signal<string>("");
  /** Convenio de flotilla del cliente elegido; aplica % sobre la unidad. */
  convenio = signal<ConvenioResumen | null>(null);
  private destroy$ = new Subject<void>();
  private accessoriesDirty = signal(0);

  readonly financingTypes = [
    { value: UnitSaleFinancingType.CASH, label: "Contado" },
    { value: UnitSaleFinancingType.AGENCY_CREDIT, label: "Crédito agencia" },
    { value: UnitSaleFinancingType.BANK_CREDIT, label: "Crédito banco" },
  ];

  basePrice = computed(() => {
    const u = this.selectedUnit();
    return u ? Number(u.listPrice) : 0;
  });

  accessoriesTotal = computed(() => {
    this.accessoriesDirty();
    const arr = this.form?.get("accessories") as FormArray;
    if (!arr) return 0;
    const compat = this.compatibleAccessories();
    return arr.controls.reduce((sum, ctrl) => {
      const accessoryId = ctrl.get("accessoryId")?.value;
      const qty = Number(ctrl.get("quantity")?.value) || 0;
      const acc = compat.find((a) => a.id === accessoryId);
      return sum + (acc ? Number(acc.price) * qty : 0);
    }, 0);
  });

  totalPrice = computed(
    () => this.basePrice() + this.accessoriesTotal()
  );

  ngOnInit(): void {
    this.form = this.fb.group({
      catalogUnitId: ["", Validators.required],
      clientId: ["", Validators.required],
      finalPrice: [0, [Validators.required, Validators.min(0)]],
      downPayment: [0, [Validators.required, Validators.min(0)]],
      financingType: [UnitSaleFinancingType.CASH, Validators.required],
      bankFinancier: [""],
      bankFolio: [""],
      notes: [""],
      accessories: this.fb.array([]),
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    this.loadUnits();
    this.loadClients();

    this.form
      .get("catalogUnitId")
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.onUnitChange(id ?? ""));

    // Al elegir cliente, si tiene convenio de flotilla se aplica su % de
    // descuento sobre la unidad; al quitarlo, vuelve al precio de lista.
    this.form
      .get("clientId")
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((clientId: string) => {
        if (!clientId) {
          this.convenio.set(null);
          this.syncFinalPrice();
          return;
        }
        this.flotillasService.forClient(clientId).subscribe({
          next: (c) => {
            this.convenio.set(c);
            this.syncFinalPrice();
          },
          error: () => this.convenio.set(null),
        });
      });
  }

  /** Precio de la unidad con el descuento de flotilla aplicado (si hay). */
  precioConDescuento(): number {
    const pct = this.convenio()?.unitSaleDiscountPct ?? 0;
    return Math.round(this.totalPrice() * (1 - pct / 100) * 100) / 100;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBranchChange(branchId: string): void {
    this.branchFilter.set(branchId);
    this.form.patchValue({ catalogUnitId: "" });
    this.selectedUnit.set(null);
    this.compatibleAccessories.set([]);
    (this.form.get("accessories") as FormArray).clear();
    this.loadUnits(branchId || undefined);
  }

  onUnitChange(unitId: string): void {
    const unit = this.units().find((u) => u.id === unitId);
    this.selectedUnit.set(unit ?? null);
    this.compatibleAccessories.set([]);
    (this.form.get("accessories") as FormArray).clear();

    if (unit) {
      this.form.patchValue({
        finalPrice: this.precioConDescuento(),
        downPayment: 0,
      });
      this.loadCompatibleAccessories(unitId);
    } else {
      this.form.patchValue({ finalPrice: 0, downPayment: 0 });
    }
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

  private loadCompatibleAccessories(catalogUnitId: string): void {
    this.accessoriesLoading.set(true);
    this.ventasService.getCompatibleAccessories(catalogUnitId).subscribe({
      next: (list) => {
        this.compatibleAccessories.set(list);
        this.accessoriesLoading.set(false);
      },
      error: () => this.accessoriesLoading.set(false),
    });
  }

  get accessoriesArray(): FormArray {
    return this.form.get("accessories") as FormArray;
  }

  /**
   * Accesorios que un renglón puede elegir: los compatibles menos los ya
   * usados en OTROS renglones. Se conserva el del renglón actual para que su
   * propia opción no desaparezca del combo.
   *
   * Depende de `accessoriesDirty` para recomputarse cuando cambia cualquier
   * selección: al elegir uno, deja de ofrecerse en los demás.
   */
  accesoriosDisponibles(actualId: string): UnitAccessory[] {
    this.accessoriesDirty();
    const usadosEnOtros = new Set(
      this.accessoriesArray.controls
        .map((c) => c.get("accessoryId")?.value)
        .filter((v) => v && v !== actualId),
    );
    return this.compatibleAccessories().filter((a) => !usadosEnOtros.has(a.id));
  }

  /** Ya no queda ninguno por agregar: todos los compatibles están en la venta. */
  todosLosAccesoriosUsados(): boolean {
    this.accessoriesDirty();
    if (this.compatibleAccessories().length === 0) return true;
    const usados = new Set(
      this.accessoriesArray.controls.map((c) => c.get("accessoryId")?.value),
    );
    return this.compatibleAccessories().every((a) => usados.has(a.id));
  }

  addAccessory(): void {
    const compat = this.compatibleAccessories();
    if (compat.length === 0) return;

    const used = new Set(
      this.accessoriesArray.controls.map((c) => c.get("accessoryId")?.value)
    );
    const nuevo = compat.find((a) => !used.has(a.id));
    // Sin ninguno libre no se agrega un renglón: sería un duplicado forzado.
    if (!nuevo) return;

    this.accessoriesArray.push(
      this.fb.group({
        accessoryId: [nuevo.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
      })
    );
    this.syncFinalPrice();
  }

  removeAccessory(index: number): void {
    this.accessoriesArray.removeAt(index);
  }

  syncFinalPrice(): void {
    this.accessoriesDirty.update((n) => n + 1);
    this.form.patchValue({ finalPrice: this.precioConDescuento() });
  }

  getUnitLabel(u: CatalogUnit): string {
    return `${u.year} ${u.brand} ${u.model} — ${u.serialNumber}`;
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }

  getAccessoryLabel(a: UnitAccessory): string {
    return `${a.name} — $${Number(a.price).toLocaleString()}`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;

    this.syncFinalPrice();
    const raw = this.form.getRawValue();

    const dto: CreateUnitSaleDto = {
      catalogUnitId: raw.catalogUnitId,
      clientId: raw.clientId,
      finalPrice: Number(raw.finalPrice),
      downPayment: Number(raw.downPayment),
      financingType: raw.financingType,
      bankFinancier: raw.bankFinancier || undefined,
      bankFolio: raw.bankFolio || undefined,
      notes: raw.notes || undefined,
    };

    const accRaw = (raw.accessories as { accessoryId: string; quantity: number }[]).filter(
      (a) => a.accessoryId && a.quantity > 0
    );
    if (accRaw.length) {
      const merged = new Map<string, number>();
      for (const a of accRaw) {
        merged.set(a.accessoryId, (merged.get(a.accessoryId) ?? 0) + a.quantity);
      }
      dto.accessories = Array.from(merged.entries()).map(([accessoryId, quantity]) => ({
        accessoryId,
        quantity,
      }));
    }

    this.saving.set(true);
    this.ventasService.create(dto).subscribe({
      next: (sale) => {
        this.toastr.success("Venta de unidad creada");
        this.router.navigate(["/sales", sale.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.toastr.error(err?.error?.message || "Error al crear venta");
      },
    });
  }
}
