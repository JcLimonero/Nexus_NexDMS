import { Component, OnInit, inject, signal } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CotizacionesService } from "../cotizaciones.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";
import { InventarioRefaccionesService } from "../../inventario-refacciones/inventario-refacciones.service";
import { ClientesService } from "../../clientes/clientes.service";
import {
  CreateQuotationDto,
  Quotation,
  QuotationLineUrgency,
  QuotationPriceList,
  QuotationType,
} from "../models/quotation.model";
import { Part } from "../../inventario-refacciones/models/part.model";
import { ClientListItem } from "../../clientes/models/client.model";

/**
 * Presupuesto de servicio (taller): se arma por trabajos, y cada trabajo lleva
 * su mano de obra, urgencia, nota del técnico y sus refacciones. Es el flujo
 * que el cliente autoriza por trabajo. Separado del presupuesto de venta.
 */
@Component({
  selector: "app-presupuesto-servicio-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./presupuesto-servicio-form.html",
  styles: [
    `
      .combo {
        position: relative;
      }
      .combo-menu {
        position: absolute;
        z-index: 20;
        top: calc(100% + 2px);
        left: 0;
        right: 0;
        max-height: 240px;
        overflow-y: auto;
        background: #fff;
        border: 1px solid var(--border, #d9dee3);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        padding: 4px;
      }
      .combo-item {
        display: block;
        width: 100%;
        text-align: left;
        border: 0;
        background: transparent;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
        color: var(--text-primary, #21252a);
        cursor: pointer;
      }
      .combo-item:hover {
        background: var(--primary-soft, #e8f0f6);
      }
      .combo-empty {
        padding: 8px 10px;
      }
    `,
  ],
})
export class PresupuestoServicioForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cotizaciones = inject(CotizacionesService);
  private branchesService = inject(BranchesService);
  private inventario = inject(InventarioRefaccionesService);
  private clientesService = inject(ClientesService);
  private toastr = inject(ToastrService);

  form!: FormGroup;
  loading = signal(false);
  isEdit = signal(false);
  id = signal<string | null>(null);
  branches = signal<{ id: string; name: string }[]>([]);
  clients = signal<ClientListItem[]>([]);
  parts = signal<Part[]>([]);
  /** Combobox de refacción abierto, con clave "i:j" (solo uno a la vez). */
  comboAbierto = signal<string | null>(null);
  private cerrarTimer: ReturnType<typeof setTimeout> | null = null;

  readonly urgencyOptions = [
    { value: QuotationLineUrgency.URGENTE, label: "Urgente" },
    { value: QuotationLineUrgency.RECOMENDADO, label: "Recomendado" },
    { value: QuotationLineUrgency.OPCIONAL, label: "Opcional" },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      branchId: ["", Validators.required],
      clientId: [""],
      conditions: [""],
      validityDate: [""],
      trabajos: this.fb.array([this.nuevoTrabajo()]),
    });
    this.branchesService.getAll().subscribe({
      next: (res) =>
        this.branches.set(res.data.map((b) => ({ id: b.id, name: b.name }))),
    });
    this.clientesService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.clients.set(res.data),
    });
    this.form.get("branchId")?.valueChanges.subscribe((b) => {
      if (b) this.loadParts(b);
      else this.parts.set([]);
    });

    const editId = this.route.snapshot.paramMap.get("id");
    if (editId) {
      this.isEdit.set(true);
      this.id.set(editId);
      this.cotizaciones.getQuotation(editId).subscribe({
        next: (q) => {
          if (q.status !== "DRAFT") {
            this.router.navigate(["/quotes", editId]);
            return;
          }
          this.poblar(q);
        },
        error: () => this.router.navigate(["/quotes/servicio"]),
      });
    }
  }

  private loadParts(branchId: string): void {
    this.inventario
      .getParts({ branchId, limit: 500, searchScope: "local" })
      .subscribe({ next: (res) => this.parts.set(res.data) });
  }

  /** Reconstruye los trabajos (padres) con sus refacciones (hijas) al editar. */
  private poblar(q: Quotation): void {
    this.form.patchValue({
      branchId: q.branchId,
      clientId: q.clientId || "",
      conditions: q.conditions || "",
      validityDate: q.validityDate?.slice(0, 10) || "",
    });
    this.loadParts(q.branchId);
    const items = q.items ?? [];
    this.trabajos.clear();
    for (const t of items.filter((it) => !it.parentItemId)) {
      const grupo = this.nuevoTrabajo();
      grupo.patchValue({
        descripcion: t.description,
        urgency: t.urgency ?? QuotationLineUrgency.RECOMENDADO,
        manoObra: t.unitPrice,
        technicianNote: t.technicianNote ?? "",
      });
      const refs = grupo.get("refacciones") as FormArray;
      for (const r of items.filter((x) => x.parentItemId === t.id)) {
        const rg = this.nuevaRefaccion();
        if (r.partId) {
          // Del catálogo: la descripción guardada es el nombre de la parte.
          rg.patchValue({
            manual: false,
            partId: r.partId,
            search: r.description,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          });
        } else {
          // Capturada a mano.
          rg.patchValue({
            manual: true,
            description: r.description,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          });
        }
        refs.push(rg);
      }
      this.trabajos.push(grupo);
    }
    if (!this.trabajos.length) this.trabajos.push(this.nuevoTrabajo());
  }

  get trabajos(): FormArray {
    return this.form.get("trabajos") as FormArray;
  }
  refaccionesDe(i: number): FormArray {
    return this.trabajos.at(i).get("refacciones") as FormArray;
  }

  private nuevoTrabajo(): FormGroup {
    return this.fb.group({
      descripcion: ["", Validators.required],
      urgency: [QuotationLineUrgency.RECOMENDADO],
      manoObra: [0, [Validators.min(0)]],
      technicianNote: [""],
      refacciones: this.fb.array([] as FormGroup[]),
    });
  }
  private nuevaRefaccion(): FormGroup {
    return this.fb.group({
      // manual = refacción fuera de catálogo (nombre libre, sin partId).
      manual: [false],
      partId: [""],
      // Texto visible del buscador de catálogo / etiqueta de la parte elegida.
      search: [""],
      // Nombre capturado a mano cuando manual = true.
      description: [""],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.min(0)]],
    });
  }

  addTrabajo(): void {
    this.trabajos.push(this.nuevoTrabajo());
  }
  removeTrabajo(i: number): void {
    if (this.trabajos.length > 1) this.trabajos.removeAt(i);
  }
  addRefaccion(i: number): void {
    this.refaccionesDe(i).push(this.nuevaRefaccion());
  }
  removeRefaccion(i: number, j: number): void {
    this.refaccionesDe(i).removeAt(j);
  }

  // ── Buscador de refacciones (combobox con opción "a mano") ──────────────
  private clave(i: number, j: number): string {
    return `${i}:${j}`;
  }
  abrirCombo(i: number, j: number): void {
    if (this.cerrarTimer) clearTimeout(this.cerrarTimer);
    this.comboAbierto.set(this.clave(i, j));
  }
  /** Cierre diferido para dar tiempo al click (mousedown) de una opción. */
  cerrarComboDiferido(): void {
    this.cerrarTimer = setTimeout(() => this.comboAbierto.set(null), 150);
  }
  onBuscarRefaccion(i: number, j: number, ev: Event): void {
    const q = (ev.target as HTMLInputElement).value;
    // Al teclear se abandona la parte previamente elegida del catálogo.
    this.refaccionesDe(i).at(j).patchValue({ search: q, partId: "" });
    this.abrirCombo(i, j);
  }
  /** Refacciones del catálogo que coinciden con el texto del buscador. */
  partsFiltradas(i: number, j: number): Part[] {
    const q = (this.refaccionesDe(i).at(j).get("search")?.value || "")
      .toString()
      .trim()
      .toLowerCase();
    const base = this.parts();
    const lista = q
      ? base.filter((p) =>
          `${p.sku} ${p.name}`.toLowerCase().includes(q),
        )
      : base;
    return lista.slice(0, 20);
  }
  elegirParte(i: number, j: number, p: Part): void {
    this.refaccionesDe(i).at(j).patchValue({
      manual: false,
      partId: p.id,
      search: this.partLabel(p),
      description: "",
      unitPrice: p.publicPrice,
    });
    this.comboAbierto.set(null);
  }
  /** Convierte el renglón en refacción a mano usando lo tecleado como nombre. */
  usarAMano(i: number, j: number): void {
    const ref = this.refaccionesDe(i).at(j);
    const nombre = (ref.get("search")?.value || "").toString().trim();
    ref.patchValue({ manual: true, partId: "", search: "", description: nombre });
    this.comboAbierto.set(null);
  }
  /** Regresa un renglón "a mano" al buscador de catálogo. */
  volverACatalogo(i: number, j: number): void {
    this.refaccionesDe(i)
      .at(j)
      .patchValue({ manual: false, description: "", search: "", partId: "" });
  }

  totalTrabajo(i: number): number {
    const t = this.trabajos.at(i).value;
    const refs = (t.refacciones ?? []).reduce(
      (s: number, r: { quantity: number; unitPrice: number }) =>
        s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      0,
    );
    return (Number(t.manoObra) || 0) + refs;
  }
  totales(): { subtotal: number; iva: number; total: number } {
    let subtotal = 0;
    this.trabajos.controls.forEach((_, i) => (subtotal += this.totalTrabajo(i)));
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    return { subtotal, iva, total: subtotal + iva };
  }

  partLabel(p: Part): string {
    return `${p.sku} — ${p.name}`;
  }
  clientLabel(c: ClientListItem): string {
    return this.clientesService.getDisplayName(c);
  }
  money(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    const raw = this.form.getRawValue();
    const items = (
      raw.trabajos as Array<{
        descripcion: string;
        urgency: QuotationLineUrgency;
        manoObra: number;
        technicianNote: string;
        refacciones: {
          manual: boolean;
          partId: string;
          description: string;
          quantity: number;
          unitPrice: number;
        }[];
      }>
    ).map((t) => ({
      description: t.descripcion,
      quantity: 1,
      unitPrice: Number(t.manoObra) || 0,
      urgency: t.urgency,
      technicianNote: t.technicianNote?.trim() || undefined,
      refacciones: (t.refacciones ?? [])
        .map((r) => {
          if (r.manual) {
            const nombre = (r.description || "").trim();
            if (!nombre) return null;
            return {
              description: nombre,
              quantity: Number(r.quantity) || 1,
              unitPrice: Number(r.unitPrice) || 0,
            };
          }
          if (r.partId) {
            return {
              partId: r.partId,
              quantity: Number(r.quantity) || 1,
              unitPrice: Number(r.unitPrice) || undefined,
            };
          }
          return null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    }));
    if (!items.length) {
      this.toastr.error("Agrega al menos un trabajo");
      return;
    }
    const dto: CreateQuotationDto = {
      branchId: raw.branchId,
      type: QuotationType.SERVICE,
      priceList: QuotationPriceList.PUBLIC,
      clientId: raw.clientId || undefined,
      conditions: raw.conditions || undefined,
      validityDate: raw.validityDate || undefined,
      items,
    };
    this.loading.set(true);
    const editId = this.id();
    const req = editId
      ? this.cotizaciones.updateQuotation(editId, dto)
      : this.cotizaciones.createQuotation(dto);
    req.subscribe({
      next: (q) => {
        this.toastr.success(
          editId
            ? "Presupuesto de servicio actualizado"
            : "Presupuesto de servicio creado",
        );
        this.router.navigate(["/quotes", q.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err?.error?.message || "Error al guardar el presupuesto");
      },
    });
  }
}
