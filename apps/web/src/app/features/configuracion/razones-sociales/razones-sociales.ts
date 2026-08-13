import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  NuevaRazonSocial,
  RazonSocial,
  RazonesSocialesService,
  TIPOS_RAZON_SOCIAL,
  TipoRazonSocial,
} from "./razones-sociales.service";
import { BranchesService } from "../../inventario-refacciones/services/branches.service";

/**
 * Razones sociales del grupo.
 *
 * Listado y alta en la misma pantalla: son pocas —un grupo rara vez pasa de
 * media docena— y abrirlas en otra ruta para escribir dos campos solo añade
 * pasos. Se muestra cuántas sucursales cuelgan de cada una porque es lo que
 * decide si se puede desactivar.
 */
@Component({
  selector: "app-razones-sociales",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./razones-sociales.html",
  styleUrls: ["./razones-sociales.scss"],
})
export class RazonesSociales implements OnInit {
  private srv = inject(RazonesSocialesService);
  private branches = inject(BranchesService);
  private toastr = inject(ToastrService);

  readonly tipos = TIPOS_RAZON_SOCIAL;

  cargando = signal(true);
  guardando = signal(false);
  razones = signal<RazonSocial[]>([]);
  /** Cuántas sucursales cuelgan de cada razón social. */
  sucursalesPor = signal<Record<string, number>>({});

  /** Fila en edición; null = alta nueva. */
  editando = signal<RazonSocial | null>(null);
  form: NuevaRazonSocial = { name: "", type: "BOTH", isActive: true, rfc: "", taxRegime: "", taxPostalCode: "", facturaapiOrgId: "" };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (r) => {
        this.razones.set(r);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.branches.getAll().subscribe({
      next: (res) => {
        const cuenta: Record<string, number> = {};
        for (const b of res.data) {
          if (b.legalEntityId) {
            cuenta[b.legalEntityId] = (cuenta[b.legalEntityId] ?? 0) + 1;
          }
        }
        this.sucursalesPor.set(cuenta);
      },
    });
  }

  etiquetaTipo(t: TipoRazonSocial): string {
    return this.tipos.find((x) => x.value === t)?.label ?? t;
  }

  sucursales(r: RazonSocial): number {
    return this.sucursalesPor()[r.id] ?? 0;
  }

  nueva(): void {
    this.editando.set(null);
    this.form = { name: "", type: "BOTH", isActive: true, rfc: "", taxRegime: "", taxPostalCode: "", facturaapiOrgId: "" };
  }

  editar(r: RazonSocial): void {
    this.editando.set(r);
    this.form = {
      name: r.name,
      type: r.type,
      isActive: r.isActive,
      rfc: r.rfc ?? "",
      taxRegime: r.taxRegime ?? "",
      taxPostalCode: r.taxPostalCode ?? "",
      facturaapiOrgId: r.facturaapiOrgId ?? "",
    };
  }

  guardar(): void {
    if (!this.form.name.trim()) {
      this.toastr.warning("La razón social necesita nombre");
      return;
    }
    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.srv.actualizar(actual.id, this.form)
      : this.srv.crear(this.form);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastr.success(actual ? "Razón social actualizada" : "Razón social creada");
        this.nueva();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        const msg = e?.error?.message;
        this.toastr.error(Array.isArray(msg) ? msg[0] : msg || "No se pudo guardar");
      },
    });
  }

  eliminar(r: RazonSocial): void {
    // Con sucursales colgando, borrar dejaría huérfanas las órdenes y el
    // alcance de los usuarios: se sugiere desactivar en su lugar.
    if (this.sucursales(r) > 0) {
      this.toastr.warning(
        `"${r.name}" tiene ${this.sucursales(r)} sucursal(es). Desactívala en vez de borrarla.`,
      );
      return;
    }
    this.srv.eliminar(r.id).subscribe({
      next: () => {
        this.toastr.success("Razón social eliminada");
        this.cargar();
      },
      error: (e) =>
        this.toastr.error(e?.error?.message || "No se pudo eliminar"),
    });
  }

  alternarActiva(r: RazonSocial): void {
    this.srv.actualizar(r.id, { isActive: !r.isActive }).subscribe({
      next: () => {
        this.toastr.success(r.isActive ? "Desactivada" : "Activada");
        this.cargar();
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo cambiar"),
    });
  }
}
