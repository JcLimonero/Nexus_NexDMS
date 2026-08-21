import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  ComisionPreview,
  ComisionesService,
  Mecanico,
} from "./comisiones.service";

const TIPOS_CARGO = [
  { value: "CLIENT", label: "Cliente" },
  { value: "WARRANTY", label: "Garantía" },
  { value: "INTERNAL", label: "Interno" },
  { value: "QUOTE", label: "Presupuesto" },
  { value: "FAST_SERVICE", label: "Servicio rápido" },
];

/**
 * Comisiones a mecánicos: configura los tipos de cargo exentos y calcula, por
 * mecánico y rango de fechas, la comisión + sueldo garantía a pagar.
 */
@Component({
  selector: "app-comisiones",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./comisiones.html",
})
export class Comisiones implements OnInit {
  private srv = inject(ComisionesService);
  private toastr = inject(ToastrService);

  readonly tiposCargo = TIPOS_CARGO;

  mecanicos = signal<Mecanico[]>([]);
  exentos = signal<string[]>([]);
  guardandoExentos = signal(false);

  mecanicoId = signal<string>("");
  desde = signal<string>("");
  hasta = signal<string>("");
  cargando = signal(false);
  resultado = signal<ComisionPreview | null>(null);

  ngOnInit(): void {
    // Rango por defecto: quincena en curso (día 1-15 o 16-fin).
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    const d = hoy.getDate();
    const ini = d <= 15 ? 1 : 16;
    const fin = d <= 15 ? 15 : new Date(y, m + 1, 0).getDate();
    const fmt = (dd: number) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    this.desde.set(fmt(ini));
    this.hasta.set(fmt(fin));

    this.srv.mecanicos().subscribe({
      next: (us) =>
        this.mecanicos.set(us.filter((u) => u.roles?.includes("MECHANIC"))),
    });
    this.srv.getExentos().subscribe({
      next: (r) => this.exentos.set(r.exemptChargeTypes ?? []),
    });
  }

  esExento(t: string): boolean {
    return this.exentos().includes(t);
  }

  alternarExento(t: string): void {
    this.exentos.update((l) =>
      l.includes(t) ? l.filter((x) => x !== t) : [...l, t],
    );
  }

  guardarExentos(): void {
    this.guardandoExentos.set(true);
    this.srv.setExentos(this.exentos()).subscribe({
      next: (r) => {
        this.exentos.set(r.exemptChargeTypes ?? []);
        this.guardandoExentos.set(false);
        this.toastr.success("Tipos exentos guardados");
      },
      error: (e) => {
        this.guardandoExentos.set(false);
        this.toastr.error(e?.error?.message || "No se pudo guardar");
      },
    });
  }

  puedeCalcular = computed(
    () => !!this.mecanicoId() && !!this.desde() && !!this.hasta(),
  );

  calcular(): void {
    if (!this.puedeCalcular()) {
      this.toastr.warning("Elige mecánico y fechas");
      return;
    }
    this.cargando.set(true);
    this.resultado.set(null);
    this.srv.preview(this.mecanicoId(), this.desde(), this.hasta()).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo calcular");
      },
    });
  }

  etiquetaCargo(v: string): string {
    return this.tiposCargo.find((t) => t.value === v)?.label ?? v;
  }

  money(n: number): string {
    return (Number(n) || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  }
}
