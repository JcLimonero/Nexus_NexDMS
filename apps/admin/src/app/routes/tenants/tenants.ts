import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../core/auth/auth.service";
import {
  Modulo,
  NuevoTenant,
  PLANES,
  Plan,
  Tenant,
  TenantsService,
} from "./tenants.service";

/**
 * Portal de administración del SaaS: los grupos que usan NexDMS.
 *
 * Todo vive en una pantalla —alta, plan, suspensión y módulos— porque son
 * pocas operaciones y siempre se hacen sobre el mismo cliente: partirlo en
 * rutas obligaría a ir y volver para algo que se resuelve de una sentada.
 */
@Component({
  selector: "app-tenants",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./tenants.html",
  styleUrls: ["./tenants.scss"],
})
export class Tenants implements OnInit {
  private srv = inject(TenantsService);
  readonly auth = inject(AuthService);

  readonly planes = PLANES;

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);
  tenants = signal<Tenant[]>([]);
  catalogo = signal<Modulo[]>([]);

  /** Tenant en edición; null = alta nueva. */
  editando = signal<Tenant | null>(null);
  form: NuevoTenant = { name: "", slug: "", plan: "BASIC", isActive: true };

  /** Tenant cuyos módulos se están ajustando. */
  moduloDe = signal<Tenant | null>(null);
  seleccion = signal<Set<string>>(new Set());

  /**
   * Módulos que el plan del tenant permite. El plan es el tope; dentro de él
   * se puede apagar lo que el cliente no contrató.
   */
  modulosDelPlan = computed(() => {
    const t = this.moduloDe();
    if (!t) return [];
    const tope = this.ordenPlan(t.plan);
    return this.catalogo().filter((m) => this.ordenPlan(m.minPlan) <= tope);
  });

  /** Los que quedan fuera por plan: se muestran para poder venderlos. */
  modulosFueraDePlan = computed(() => {
    const t = this.moduloDe();
    if (!t) return [];
    const tope = this.ordenPlan(t.plan);
    return this.catalogo().filter((m) => this.ordenPlan(m.minPlan) > tope);
  });

  ngOnInit(): void {
    this.cargar();
    this.srv.catalogo().subscribe({
      next: (c) => this.catalogo.set(c.modules ?? []),
    });
  }

  private ordenPlan(p: Plan): number {
    return this.planes.find((x) => x.value === p)?.orden ?? 0;
  }

  etiquetaPlan(p: Plan): string {
    return this.planes.find((x) => x.value === p)?.label ?? p;
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 3500);
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (t) => {
        this.tenants.set(t);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.avisar("No se pudo cargar la lista de clientes", "error");
      },
    });
  }

  // ─── Alta y edición ─────────────────────────────────────────

  nuevo(): void {
    this.editando.set(null);
    this.form = { name: "", slug: "", plan: "BASIC", isActive: true };
  }

  editar(t: Tenant): void {
    this.editando.set(t);
    this.form = {
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      isActive: t.isActive,
    };
  }

  /** El identificador sale del nombre; se puede corregir a mano. */
  alEscribirNombre(): void {
    if (this.editando()) return;
    this.form.slug = this.form.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  guardar(): void {
    if (!this.form.name.trim() || !this.form.slug.trim()) {
      this.avisar("Falta el nombre o el identificador", "error");
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
        this.avisar(actual ? "Cliente actualizado" : "Cliente dado de alta");
        this.nuevo();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        const msg = e?.error?.message;
        this.avisar(
          Array.isArray(msg) ? msg[0] : msg || "No se pudo guardar",
          "error",
        );
      },
    });
  }

  alternarSuspension(t: Tenant): void {
    this.srv.suspender(t.id).subscribe({
      next: () => {
        this.avisar(t.isActive ? "Cliente suspendido" : "Cliente reactivado");
        this.cargar();
      },
      error: (e) =>
        this.avisar(e?.error?.message || "No se pudo cambiar", "error"),
    });
  }

  // ─── Módulos ────────────────────────────────────────────────

  abrirModulos(t: Tenant): void {
    this.moduloDe.set(t);
    this.srv.modulosDe(t.id).subscribe({
      next: (r) => {
        // `null` significa "todo lo que el plan permite": se marca completo
        // para que el superadmin vea el estado real, no una lista vacía.
        const permitidos = this.catalogo()
          .filter((m) => this.ordenPlan(m.minPlan) <= this.ordenPlan(t.plan))
          .map((m) => m.key);
        this.seleccion.set(new Set(r.enabledModules ?? permitidos));
      },
    });
  }

  cerrarModulos(): void {
    this.moduloDe.set(null);
  }

  activo(m: Modulo): boolean {
    return m.core || this.seleccion().has(m.key);
  }

  alternarModulo(m: Modulo): void {
    if (m.core) return;
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(m.key)) n.delete(m.key);
      else n.add(m.key);
      return n;
    });
  }

  guardarModulos(): void {
    const t = this.moduloDe();
    if (!t) return;
    this.guardando.set(true);
    // Los de núcleo van siempre, aunque el clic no los toque.
    const claves = new Set(this.seleccion());
    for (const m of this.modulosDelPlan()) if (m.core) claves.add(m.key);
    this.srv.guardarModulos(t.id, [...claves]).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(`Módulos de ${t.name} actualizados`);
        this.cerrarModulos();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisar(e?.error?.message || "No se pudo guardar", "error");
      },
    });
  }

  contarActivos(t: Tenant): string {
    const permitidos = this.catalogo().filter(
      (m) => this.ordenPlan(m.minPlan) <= this.ordenPlan(t.plan),
    ).length;
    const activos = t.enabledModules?.length ?? permitidos;
    return `${activos} de ${permitidos}`;
  }
}
