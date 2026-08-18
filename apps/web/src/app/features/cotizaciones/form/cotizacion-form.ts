import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CotizacionesService } from "../cotizaciones.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../inventario-refacciones/inventario-refacciones.service";
import { InventarioUnidadesService } from "../../inventario-unidades/inventario-unidades.service";
import { ClientesService } from "../../clientes/clientes.service";
import {
  CreateQuotationDto,
  CreateQuotationItemDto,
  QuotationType,
  QuotationPriceList,
  QuotationLineUrgency,
} from "../models/quotation.model";
import { Part } from "../../inventario-refacciones/models/part.model";
import { CatalogUnit } from "../../inventario-unidades/models/catalog-unit.model";
import { ClientListItem } from "../../clientes/models/client.model";

@Component({
  selector: "app-cotizacion-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./cotizacion-form.html",
  styleUrls: ["./cotizacion-form.scss"],
})
export class CotizacionForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cotizacionesService = inject(CotizacionesService);
  private branchesService = inject(BranchesService);
  private inventarioRefacciones = inject(InventarioRefaccionesService);
  private inventarioUnidades = inject(InventarioUnidadesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  id = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  clients = signal<ClientListItem[]>([]);
  parts = signal<Part[]>([]);
  units = signal<CatalogUnit[]>([]);
  partsLoading = signal(false);
  unitsLoading = signal(false);

  readonly typeOptions = [
    { value: QuotationType.PARTS, label: "Refacciones" },
    { value: QuotationType.SERVICE, label: "Servicio" },
    { value: QuotationType.UNIT, label: "Unidad" },
  ];

  readonly priceListOptions = [
    { value: QuotationPriceList.PUBLIC, label: "Público" },
    { value: QuotationPriceList.WHOLESALE, label: "Mayoreo" },
    { value: QuotationPriceList.BUSINESS, label: "Empresa" },
  ];

  readonly urgencyOptions = [
    { value: QuotationLineUrgency.URGENTE, label: "Urgente" },
    { value: QuotationLineUrgency.RECOMENDADO, label: "Recomendado" },
    { value: QuotationLineUrgency.OPCIONAL, label: "Opcional" },
  ];

  /** Fotos ya subidas por línea (índice → fotos). Solo en edición. */
  fotosPorLinea = signal<Record<number, { id: string; url: string | null }[]>>({});
  subiendoFoto = signal<number | null>(null);

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      type: [QuotationType.PARTS, Validators.required],
      priceList: [QuotationPriceList.PUBLIC, Validators.required],
      clientId: [""],
      discountPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      conditions: [""],
      validityDate: [""],
      items: this.fb.array([this.createItemGroup()]),
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });

    this.form.get("type")?.valueChanges.subscribe((type) => {
      if (type === QuotationType.UNIT) {
        this.form.patchValue({ priceList: QuotationPriceList.PUBLIC });
      }
    });

    this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
      if (branchId) {
        this.loadParts(branchId);
        this.loadUnits(branchId);
      } else {
        this.parts.set([]);
        this.units.set([]);
      }
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.isEdit.set(true);
      this.id.set(id);
      this.cotizacionesService.getQuotation(id).subscribe({
        next: (q) => {
          if (q.status !== "DRAFT") {
            this.router.navigate(["/quotes", id]);
            return;
          }
          this.form.patchValue({
            branchId: q.branchId,
            type: q.type,
            priceList: q.priceList,
            clientId: q.clientId || "",
            discountPct: q.discountPct,
            conditions: q.conditions || "",
            validityDate: q.validityDate?.slice(0, 10) || "",
          });
          this.items.clear();
          const fotos: Record<number, { id: string; url: string | null }[]> = {};
          (q.items || []).forEach((it, i) => {
            this.items.push(
              this.fb.group({
                id: [it.id],
                partId: [it.partId || ""],
                catalogUnitId: [it.catalogUnitId || ""],
                description: [it.description],
                quantity: [it.quantity, [Validators.required, Validators.min(1)]],
                unitPrice: [it.unitPrice, [Validators.required, Validators.min(0)]],
                discount: [it.discount || 0, [Validators.min(0)]],
                urgency: [it.urgency || QuotationLineUrgency.RECOMENDADO],
                technicianNote: [it.technicianNote || ""],
              })
            );
            if (it.photos?.length) fotos[i] = it.photos;
          });
          this.fotosPorLinea.set(fotos);
          this.loadParts(q.branchId);
          this.loadUnits(q.branchId);
        },
        error: () => this.router.navigate(["/quotes"]),
      });
    } else {
      const branchId = this.form.get("branchId")?.value;
      if (branchId) {
        this.loadParts(branchId);
        this.loadUnits(branchId);
      }
    }
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      id: [""],
      partId: [""],
      catalogUnitId: [""],
      description: [""],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      urgency: [QuotationLineUrgency.RECOMENDADO],
      technicianNote: [""],
    });
  }

  get items(): FormArray {
    return this.form.get("items") as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  fotosDe(index: number): { id: string; url: string | null }[] {
    return this.fotosPorLinea()[index] ?? [];
  }

  /**
   * Sube una foto de lo que se recomienda cambiar a esta línea. Solo funciona
   * si el presupuesto ya está guardado (la línea necesita id).
   */
  subirFoto(index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const qid = this.id();
    const itemId = this.items.at(index).get("id")?.value;
    if (!qid || !itemId) {
      this.toastr.info("Guarda el presupuesto primero para poder subir fotos.");
      input.value = "";
      return;
    }
    this.subiendoFoto.set(index);
    this.cotizacionesService.uploadItemPhoto(qid, itemId, file).subscribe({
      next: (foto) => {
        const map = { ...this.fotosPorLinea() };
        map[index] = [...(map[index] ?? []), foto];
        this.fotosPorLinea.set(map);
        this.subiendoFoto.set(null);
        this.toastr.success("Foto agregada");
      },
      error: (err) => {
        this.subiendoFoto.set(null);
        this.toastr.error(err?.error?.message || "No se pudo subir la foto");
      },
    });
    input.value = "";
  }

  private loadParts(branchId: string): void {
    this.partsLoading.set(true);
    this.inventarioRefacciones
      .getParts({ branchId, limit: 500, searchScope: "local" })
      .subscribe({
        next: (res) => {
          this.parts.set(res.data);
          this.partsLoading.set(false);
        },
        error: () => this.partsLoading.set(false),
      });
  }

  private loadUnits(branchId: string): void {
    this.unitsLoading.set(true);
    this.inventarioUnidades.getUnits({ branchId, limit: 500 }).subscribe({
      next: (res) => {
        this.units.set(res.data);
        this.unitsLoading.set(false);
      },
      error: () => this.unitsLoading.set(false),
    });
  }

  onPartSelect(index: number): void {
    const partId = this.items.at(index).get("partId")?.value;
    const priceList = this.form.get("priceList")?.value as QuotationPriceList;
    const part = this.parts().find((p) => p.id === partId);
    if (part) {
      let price = part.publicPrice;
      if (priceList === QuotationPriceList.WHOLESALE) price = part.wholesalePrice;
      else if (priceList === QuotationPriceList.BUSINESS) price = part.businessPrice;
      this.items.at(index).patchValue({
        unitPrice: price,
        catalogUnitId: "",
        description: part.name,
      });
    }
  }

  onUnitSelect(index: number): void {
    const unitId = this.items.at(index).get("catalogUnitId")?.value;
    const priceList = this.form.get("priceList")?.value as QuotationPriceList;
    const unit = this.units().find((u) => u.id === unitId);
    if (unit) {
      const price =
        priceList === QuotationPriceList.BUSINESS ? unit.salePrice : unit.listPrice;
      this.items.at(index).patchValue({
        unitPrice: price,
        partId: "",
        description: `${unit.brand} ${unit.model} ${unit.year}`,
      });
    }
  }

  getTotalCalculado(): { subtotal: number; tax: number; total: number } {
    const discountPct = this.form?.get("discountPct")?.value ?? 0;
    const lines = this.items?.value as Array<{
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    if (!lines?.length) return { subtotal: 0, tax: 0, total: 0 };
    let subtotal = 0;
    for (const l of lines) {
      subtotal += l.quantity * (l.unitPrice ?? 0) - (l.discount ?? 0);
    }
    const discountAmount = (subtotal * discountPct) / 100;
    subtotal -= discountAmount;
    const tax = Math.round(subtotal * 0.16 * 100) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const items: CreateQuotationItemDto[] = [];

    for (const it of raw.items) {
      const hasPart = !!it.partId;
      const hasUnit = !!it.catalogUnitId;
      const hasDesc = !!it.description?.trim();
      if (!hasPart && !hasUnit && !hasDesc) continue;

      const item: CreateQuotationItemDto = {
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount) || 0,
        urgency: it.urgency || undefined,
        technicianNote: it.technicianNote?.trim() || undefined,
      };
      if (hasPart) item.partId = it.partId;
      else if (hasUnit) item.catalogUnitId = it.catalogUnitId;
      else item.description = it.description;
      items.push(item);
    }

    if (items.length === 0) {
      this.toastr.error("Debe incluir al menos un ítem (parte, unidad o descripción)");
      return;
    }

    const dto: CreateQuotationDto = {
      branchId: raw.branchId,
      type: raw.type as QuotationType,
      priceList: (raw.type === QuotationType.UNIT ? QuotationPriceList.PUBLIC : raw.priceList) as QuotationPriceList,
      clientId: raw.clientId || undefined,
      discountPct: Number(raw.discountPct) || 0,
      conditions: raw.conditions || undefined,
      validityDate: raw.validityDate || undefined,
      items,
    };

    const editId = this.id();
    this.loading.set(true);

    if (editId) {
      this.cotizacionesService.updateQuotation(editId, dto).subscribe({
        next: (q) => {
          this.toastr.success("Cotización actualizada");
          this.router.navigate(["/quotes", q.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.cotizacionesService.createQuotation(dto).subscribe({
        next: (q) => {
          this.toastr.success("Cotización creada");
          this.router.navigate(["/quotes", q.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }

  getPartLabel(p: Part): string {
    return `${p.sku} — ${p.name}`;
  }

  getUnitLabel(u: CatalogUnit): string {
    return `${u.year} ${u.brand} ${u.model}`;
  }

  getClientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }
}
