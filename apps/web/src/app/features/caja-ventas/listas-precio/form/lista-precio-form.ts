import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CajaVentasService } from "../../caja-ventas.service";
import { BranchesService } from "../../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../../inventario-refacciones/inventario-refacciones.service";
import { Part } from "../../../inventario-refacciones/models/part.model";
import {
  CreatePriceListDto,
  PriceListItem,
  PriceListType,
} from "../../models/price-list.model";

@Component({
  selector: "app-lista-precio-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: "./lista-precio-form.html",
  styleUrls: ["./lista-precio-form.scss"],
})
export class ListaPrecioForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cajaService = inject(CajaVentasService);
  private branchesService = inject(BranchesService);
  private partsService = inject(InventarioRefaccionesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  branches = signal<{ id: string; name: string }[]>([]);
  isEdit = signal(false);
  id = signal<string | null>(null);

  // Editor de precios por parte (solo en edición).
  items = signal<PriceListItem[]>([]);
  busqueda = "";
  resultados = signal<Part[]>([]);
  buscando = signal(false);
  // Precio capturado por parte encontrada, indexado por partId.
  precios: Record<string, number | null> = {};
  private partNombre = new Map<string, string>();

  readonly typeOptions = [
    { value: PriceListType.PUBLIC, label: "Público" },
    { value: PriceListType.WHOLESALE, label: "Mayoreo" },
    { value: PriceListType.BUSINESS, label: "Empresa" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      name: ["", [Validators.required, Validators.maxLength(200)]],
      type: [PriceListType.PUBLIC, Validators.required],
      discountPct: [
        0,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      validFrom: [""],
      validTo: [""],
      isActive: [true],
    });

    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });

    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.isEdit.set(true);
      this.id.set(id);
      this.cajaService.getPriceList(id).subscribe({
        next: (list) => {
          this.form.patchValue({
            branchId: list.branchId,
            name: list.name,
            type: list.type,
            discountPct: list.discountPct,
            validFrom: list.validFrom ?? "",
            validTo: list.validTo ?? "",
            isActive: list.isActive,
          });
        },
        error: () => this.router.navigate(["/cash-register/listas-precio"]),
      });
      this.cargarItems();
    }
  }

  private cargarItems(): void {
    const id = this.id();
    if (!id) return;
    this.cajaService.getPriceListItems(id).subscribe({
      next: (items) => this.items.set(items),
    });
  }

  nombreParte(partId: string): string {
    return this.partNombre.get(partId) ?? partId.slice(0, 8);
  }

  buscarPartes(): void {
    const term = this.busqueda.trim();
    if (term.length < 2) {
      this.resultados.set([]);
      return;
    }
    const branchId = this.form.get("branchId")?.value as string;
    this.buscando.set(true);
    this.partsService.getParts({ search: term, branchId }).subscribe({
      next: (res) => {
        this.resultados.set(res.data);
        for (const p of res.data)
          this.partNombre.set(p.id, `${p.sku} · ${p.name}`);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false),
    });
  }

  yaEnLista(partId: string): boolean {
    return this.items().some((i) => i.partId === partId);
  }

  agregarItem(part: Part): void {
    const id = this.id();
    if (!id) return;
    const price = Number(this.precios[part.id]);
    if (!price || price <= 0) {
      this.toastr.warning("Captura un precio válido");
      return;
    }
    this.cajaService
      .upsertPriceListItem(id, { partId: part.id, price })
      .subscribe({
        next: () => {
          this.toastr.success(`Precio fijado para ${part.sku}`);
          this.precios[part.id] = null;
          this.cargarItems();
        },
        error: (err) =>
          this.toastr.error(err?.error?.message || "No se pudo guardar"),
      });
  }

  quitarItem(item: PriceListItem): void {
    const id = this.id();
    if (!id) return;
    this.cajaService.deletePriceListItem(id, item.id).subscribe({
      next: () => {
        this.toastr.success("Precio quitado");
        this.cargarItems();
      },
      error: () => this.toastr.error("No se pudo quitar"),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    const raw = this.form.getRawValue();
    const dto: CreatePriceListDto = {
      branchId: raw.branchId,
      name: raw.name,
      type: raw.type as PriceListType,
      discountPct: Number(raw.discountPct) || 0,
      validFrom: raw.validFrom || null,
      validTo: raw.validTo || null,
      isActive: raw.isActive ?? true,
    };

    const editId = this.id();
    this.loading.set(true);

    if (editId) {
      this.cajaService.updatePriceList(editId, dto).subscribe({
        next: () => {
          this.loading.set(false);
          this.toastr.success("Lista actualizada");
          this.router.navigate(["/cash-register/listas-precio"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al actualizar");
        },
      });
    } else {
      this.cajaService.createPriceList(dto).subscribe({
        next: () => {
          this.toastr.success("Lista creada");
          this.router.navigate(["/cash-register/listas-precio"]);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err?.error?.message || "Error al crear");
        },
      });
    }
  }
}
