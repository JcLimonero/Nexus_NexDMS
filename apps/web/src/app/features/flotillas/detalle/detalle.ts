import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import {
  ClienteOpcion,
  ConvenioPayload,
  FlotillasService,
  PriceListOpcion,
  UnidadConvenio,
  VehiculoDisponible,
} from "../flotillas.service";

/** Alta/edición de un convenio de flotilla y sus unidades adscritas. */
@Component({
  selector: "app-flotillas-detalle",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./detalle.html",
  styleUrls: ["../flotillas.scss"],
})
export class Detalle implements OnInit {
  private srv = inject(FlotillasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  id = signal<string | null>(null);
  cargando = signal(true);
  guardando = signal(false);

  form = signal<ConvenioPayload>(this.vacio());
  listas = signal<PriceListOpcion[]>([]);

  // Cliente (alta): búsqueda
  clienteNombre = signal("");
  sugerencias = signal<ClienteOpcion[]>([]);

  // Unidades (edición)
  unidades = signal<UnidadConvenio[]>([]);
  disponibles = signal<VehiculoDisponible[]>([]);
  vehiculoElegido = signal("");
  vigente = signal(false);

  esNuevo = computed(() => !this.id());

  private vacio(): ConvenioPayload {
    return {
      clientId: "",
      agreementNumber: "",
      name: "",
      partsPriceListId: null,
      partsDiscountPct: null,
      laborDiscountPct: null,
      unitSaleDiscountPct: null,
      validFrom: null,
      validTo: null,
      isActive: true,
      notes: null,
    };
  }

  ngOnInit(): void {
    this.srv.priceLists().subscribe({ next: (l) => this.listas.set(l) });
    const id = this.route.snapshot.paramMap.get("id");
    if (!id || id === "nueva") {
      this.cargando.set(false);
      return;
    }
    this.id.set(id);
    this.cargar(id);
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.srv.detalle(id).subscribe({
      next: (d) => {
        this.form.set({
          clientId: d.clientId,
          agreementNumber: d.agreementNumber,
          name: d.name,
          partsPriceListId: d.partsPriceListId,
          partsDiscountPct: d.partsDiscountPct,
          laborDiscountPct: d.laborDiscountPct,
          unitSaleDiscountPct: d.unitSaleDiscountPct,
          validFrom: d.validFrom,
          validTo: d.validTo,
          isActive: d.isActive,
          notes: d.notes,
        });
        this.clienteNombre.set(d.clienteNombre);
        this.vigente.set(d.vigente);
        this.unidades.set(d.unidades);
        this.cargarDisponibles(id);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudo cargar el convenio");
        this.router.navigate(["/fleets"]);
      },
    });
  }

  private cargarDisponibles(id: string): void {
    this.srv.unidadesDisponibles(id).subscribe({
      next: (v) => this.disponibles.set(v),
    });
  }

  // ── Cliente (alta) ──
  buscarCliente(q: string): void {
    this.clienteNombre.set(q);
    if (q.trim().length < 2) {
      this.sugerencias.set([]);
      return;
    }
    this.srv.buscarClientes(q).subscribe({
      next: (cs) => this.sugerencias.set(cs),
    });
  }

  elegirCliente(c: ClienteOpcion): void {
    this.form.update((f) => ({ ...f, clientId: c.id }));
    this.clienteNombre.set(c.nombre);
    this.sugerencias.set([]);
  }

  usaLista(): boolean {
    return !!this.form().partsPriceListId;
  }

  guardar(): void {
    const f = this.form();
    if (!f.clientId) {
      this.toastr.warning("Elige la empresa del convenio");
      return;
    }
    if (!f.agreementNumber?.trim() || !f.name?.trim()) {
      this.toastr.warning("Falta número de convenio y nombre");
      return;
    }
    const payload: ConvenioPayload = {
      ...f,
      partsDiscountPct: f.partsPriceListId
        ? null
        : this.num(f.partsDiscountPct),
      laborDiscountPct: this.num(f.laborDiscountPct),
      unitSaleDiscountPct: this.num(f.unitSaleDiscountPct),
    };
    this.guardando.set(true);
    const id = this.id();
    const op = id ? this.srv.actualizar(id, payload) : this.srv.crear(payload);
    op.subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.toastr.success(id ? "Convenio actualizado" : "Convenio creado");
        if (!id) this.router.navigate(["/fleets", c.id]);
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo guardar");
      },
    });
  }

  private num(v: number | null | undefined): number | null {
    if (v === null || v === undefined || (v as unknown as string) === "") {
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ── Unidades ──
  agregarUnidad(): void {
    const id = this.id();
    const v = this.vehiculoElegido();
    if (!id || !v) return;
    this.srv.agregarUnidad(id, v).subscribe({
      next: () => {
        this.vehiculoElegido.set("");
        this.cargar(id);
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo agregar"),
    });
  }

  quitarUnidad(u: UnidadConvenio): void {
    const id = this.id();
    if (!id) return;
    this.srv.quitarUnidad(u.unitId).subscribe({
      next: () => this.cargar(id),
      error: () => this.toastr.error("No se pudo quitar la unidad"),
    });
  }

  eliminar(): void {
    const id = this.id();
    if (!id || !confirm("¿Eliminar este convenio de flotilla?")) return;
    this.srv.eliminar(id).subscribe({
      next: () => {
        this.toastr.success("Convenio eliminado");
        this.router.navigate(["/fleets"]);
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo eliminar"),
    });
  }

  vehiculoLabel(v: VehiculoDisponible): string {
    return [v.make, v.model, v.year, v.plate].filter(Boolean).join(" · ");
  }
}
