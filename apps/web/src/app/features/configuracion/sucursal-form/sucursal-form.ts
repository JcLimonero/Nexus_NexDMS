import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { Sucursal, SucursalFormService } from "./sucursal-form.service";
import {
  RazonSocial,
  RazonesSocialesService,
} from "../razones-sociales/razones-sociales.service";

const DIAS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

/**
 * Alta y edición de sucursales.
 *
 * Los datos fiscales no están aquí: son de la razón social. La sucursal elige
 * de cuál cuelga y de ahí hereda RFC, régimen y domicilio fiscal, así que el
 * combo es obligatorio — una sucursal huérfana no podría facturar.
 */
@Component({
  selector: "app-sucursal-form",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./sucursal-form.html",
  styleUrls: ["./sucursal-form.scss"],
})
export class SucursalForm implements OnInit {
  private srv = inject(SucursalFormService);
  private razonesSrv = inject(RazonesSocialesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  readonly dias = DIAS;

  esEdicion = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  razones = signal<RazonSocial[]>([]);
  private id: string | null = null;

  form: Sucursal = {
    legalEntityId: "",
    name: "",
    slug: "",
    address: "",
    city: "",
    state: "",
    counterPhone: "",
    email: "",
    schedule: {},
    taxRate: 0.16,
    maxDiscountPct: 10,
    quotationValidityDays: 15,
    isActive: true,
  };
  horario: Record<string, string> = {};

  ngOnInit(): void {
    this.razonesSrv.listar(true).subscribe({
      next: (r) => this.razones.set(r),
    });

    this.id = this.route.snapshot.paramMap.get("id");
    if (this.id) {
      this.esEdicion.set(true);
      this.cargando.set(true);
      this.srv.obtener(this.id).subscribe({
        next: (s) => {
          this.form = { ...this.form, ...s };
          this.horario = { ...(s.schedule ?? {}) };
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.toastr.error("No se pudo cargar la sucursal");
        },
      });
    }
  }

  /** El slug sale del nombre; se puede corregir a mano. */
  alEscribirNombre(): void {
    if (this.esEdicion()) return;
    this.form.slug = this.form.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  razonElegida(): RazonSocial | undefined {
    return this.razones().find((r) => r.id === this.form.legalEntityId);
  }

  private faltantes(): string[] {
    const req: [keyof Sucursal, string][] = [
      ["legalEntityId", "razón social"],
      ["name", "nombre"],
      ["slug", "identificador"],
      ["address", "dirección"],
      ["city", "ciudad"],
      ["state", "estado"],
      ["counterPhone", "teléfono de mostrador"],
      ["email", "correo"],
    ];
    return req
      .filter(([k]) => !String(this.form[k] ?? "").trim())
      .map(([, etiqueta]) => etiqueta);
  }

  guardar(): void {
    const faltan = this.faltantes();
    if (faltan.length) {
      this.toastr.warning(`Falta capturar: ${faltan.join(", ")}`);
      return;
    }
    // El horario viaja como objeto; se descartan los días sin capturar.
    const schedule: Record<string, string> = {};
    for (const d of this.dias) {
      if (this.horario[d]?.trim()) schedule[d] = this.horario[d].trim();
    }
    if (!Object.keys(schedule).length) {
      this.toastr.warning("Captura el horario de al menos un día");
      return;
    }

    this.guardando.set(true);
    const dto: Sucursal = { ...this.form, schedule };
    const peticion = this.id
      ? this.srv.actualizar(this.id, dto)
      : this.srv.crear(dto);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastr.success(this.id ? "Sucursal actualizada" : "Sucursal creada");
        this.router.navigate(["/settings/sucursales"]);
      },
      error: (e) => {
        this.guardando.set(false);
        const msg = e?.error?.message;
        this.toastr.error(Array.isArray(msg) ? msg[0] : msg || "No se pudo guardar");
      },
    });
  }
}
