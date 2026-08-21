import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import {
  BodyworkItem,
  BodyworkItemStatus,
  BodyworkStatus,
  HojalateriaService,
  ItemPayload,
  OrdenDetalle,
  OrdenPayload,
  Pieza,
} from "../hojalateria.service";
import { ESTADOS, FLUJO, ITEM_ESTADOS, OPERACIONES } from "../estados";

/**
 * Recepción + orden de una unidad de carrocería: los datos y el daño, el
 * presupuesto por pieza, las fotos y el avance del estado.
 */
@Component({
  selector: "app-hojalateria-detalle",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./detalle.html",
  styleUrls: ["../hojalateria.scss"],
})
export class Detalle implements OnInit {
  private srv = inject(HojalateriaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  readonly estados = ESTADOS;
  readonly flujo = FLUJO;
  readonly operaciones = OPERACIONES;
  readonly itemEstados = ITEM_ESTADOS;

  cargando = signal(true);
  guardando = signal(false);
  orden = signal<OrdenDetalle | null>(null);
  catalogo = signal<Pieza[]>([]);

  /** Campos editables de la recepción (sirve para alta y edición). */
  form = signal<OrdenPayload>(this.formVacio());
  nuevoItem = signal<ItemPayload | null>(null);

  esNuevo = computed(() => !this.orden());

  private formVacio(): OrdenPayload {
    return {
      clientName: "",
      clientPhone: "",
      vehiclePlate: "",
      vehicleBrand: "",
      vehicleModel: "",
      vehicleYear: null,
      vehicleColor: "",
      vehicleVin: "",
      paymentType: "PARTICULAR",
      insuranceCompany: "",
      policyNumber: "",
      claimNumber: "",
      deductible: null,
      adjuster: "",
      claimDate: "",
      kmIn: null,
      fuelLevel: "",
      damageDescription: "",
      observations: "",
    };
  }

  ngOnInit(): void {
    this.srv.catalogo().subscribe({ next: (p) => this.catalogo.set(p) });
    const id = this.route.snapshot.paramMap.get("id");
    if (!id || id === "nueva") {
      this.cargando.set(false);
      return;
    }
    this.cargar(id);
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.srv.detalle(id).subscribe({
      next: (o) => {
        this.orden.set(o);
        this.form.set(this.desdeOrden(o));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastr.error("No se pudo cargar la orden");
        this.router.navigate(["/bodywork"]);
      },
    });
  }

  private desdeOrden(o: OrdenDetalle): OrdenPayload {
    return {
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      vehiclePlate: o.vehiclePlate,
      vehicleBrand: o.vehicleBrand,
      vehicleModel: o.vehicleModel,
      vehicleYear: o.vehicleYear,
      vehicleColor: o.vehicleColor,
      vehicleVin: o.vehicleVin,
      paymentType: o.paymentType,
      insuranceCompany: o.insuranceCompany,
      policyNumber: o.policyNumber,
      claimNumber: o.claimNumber,
      deductible: o.deductible,
      adjuster: o.adjuster,
      claimDate: o.claimDate,
      kmIn: o.kmIn,
      fuelLevel: o.fuelLevel,
      damageDescription: o.damageDescription,
      observations: o.observations,
    };
  }

  esSeguro(): boolean {
    return this.form().paymentType === "INSURANCE";
  }

  setPago(t: "PARTICULAR" | "INSURANCE"): void {
    this.form.update((f) => ({ ...f, paymentType: t }));
  }

  guardarRecepcion(): void {
    const f = this.form();
    if (!f.clientName?.trim()) {
      this.toastr.warning("El nombre del cliente es obligatorio");
      return;
    }
    this.guardando.set(true);
    const o = this.orden();
    const op = o
      ? this.srv.actualizar(o.id, f)
      : this.srv.crear(f);
    op.subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.toastr.success(o ? "Recepción actualizada" : "Orden creada");
        if (!o) {
          this.router.navigate(["/bodywork", res.id]);
        } else {
          this.orden.set(res);
          this.form.set(this.desdeOrden(res));
        }
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo guardar");
      },
    });
  }

  // ── Partidas ──
  abrirNuevoItem(): void {
    this.nuevoItem.set({
      partName: "",
      operation: "REPAIR",
      quantity: 1,
      laborPrice: 0,
      materialPrice: 0,
      partPrice: 0,
    });
  }

  elegirPieza(piezaId: string): void {
    const p = this.catalogo().find((x) => x.id === piezaId);
    if (!p) return;
    this.nuevoItem.update((n) =>
      n
        ? {
            ...n,
            bodyworkPartId: p.id,
            partName: p.name,
            partPrice: p.defaultPrice,
          }
        : n,
    );
  }

  agregarItem(): void {
    const o = this.orden();
    const n = this.nuevoItem();
    if (!o || !n) return;
    if (!n.partName?.trim()) {
      this.toastr.warning("Indica la pieza");
      return;
    }
    this.srv.agregarItem(o.id, n).subscribe({
      next: () => {
        this.nuevoItem.set(null);
        this.cargar(o.id);
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo agregar"),
    });
  }

  guardarItem(item: BodyworkItem): void {
    this.srv
      .actualizarItem(item.id, {
        partName: item.partName,
        operation: item.operation,
        quantity: Number(item.quantity) || 1,
        laborPrice: Number(item.laborPrice) || 0,
        materialPrice: Number(item.materialPrice) || 0,
        partPrice: Number(item.partPrice) || 0,
      })
      .subscribe({
        next: () => this.recargar(),
        error: (e) => this.toastr.error(e?.error?.message || "No se pudo guardar"),
      });
  }

  marcarItem(item: BodyworkItem, status: BodyworkItemStatus): void {
    this.srv.actualizarItem(item.id, { status }).subscribe({
      next: () => this.recargar(),
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo cambiar"),
    });
  }

  eliminarItem(item: BodyworkItem): void {
    this.srv.eliminarItem(item.id).subscribe({
      next: () => this.recargar(),
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo eliminar"),
    });
  }

  // ── Fotos ──
  subirFoto(ev: Event): void {
    const o = this.orden();
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!o || !file) return;
    this.srv.subirFoto(o.id, file).subscribe({
      next: () => {
        input.value = "";
        this.recargar();
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo subir"),
    });
  }

  eliminarFoto(photoId: string): void {
    this.srv.eliminarFoto(photoId).subscribe({
      next: () => this.recargar(),
      error: () => this.toastr.error("No se pudo eliminar la foto"),
    });
  }

  // ── Estado ──
  cambiarEstado(status: BodyworkStatus): void {
    const o = this.orden();
    if (!o || o.status === status) return;
    this.srv.actualizar(o.id, { status }).subscribe({
      next: (res) => {
        this.orden.set({ ...o, status: res.status, deliveredAt: res.deliveredAt });
        this.toastr.success("Estado actualizado");
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo cambiar"),
    });
  }

  private recargar(): void {
    const o = this.orden();
    if (o) this.cargar(o.id);
  }

  etiquetaEstado(s: string): string {
    return this.estados.find((e) => e.value === s)?.label ?? s;
  }
  etiquetaOperacion(o: string): string {
    return this.operaciones.find((x) => x.value === o)?.label ?? o;
  }
}
