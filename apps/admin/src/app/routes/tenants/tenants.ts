import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Barra } from "../../shared/barra/barra";
import { WizardAlta } from "../wizard-alta/wizard-alta";
import { EscDirective } from "../../shared/directives/esc.directive";
import {
  Modulo,
  PlanPrecio,
  NuevoTenant,
  PLANES,
  Panorama,
  Plan,
  ResumenCobro,
  SaasService,
  Tenant,
  TenantsService,
} from "./tenants.service";

/**
 * Lista de empresas del SaaS: quién usa NexQS, su plan, sus módulos y sus
 * cobros de un vistazo. El alta (rápida o guiada) vive aquí en diálogos; la
 * ficha de cada empresa —datos, cobros, marca, sucursales, usuarios, roles—
 * tiene su propia ruta (`/tenants/:id`, ver FichaEmpresa).
 */
@Component({
  selector: "app-tenants",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Barra, WizardAlta, EscDirective],
  templateUrl: "./tenants.html",
  styleUrls: ["./tenants.scss"],
})
export class Tenants implements OnInit {
  private srv = inject(TenantsService);
  private saas = inject(SaasService);

  readonly planes = PLANES;

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);
  tenants = signal<Tenant[]>([]);
  catalogo = signal<Modulo[]>([]);
  panorama = signal<Panorama | null>(null);
  /** Último pago y próximo cobro por cliente (id → resumen), para la tabla. */
  cobros = signal<Map<string, ResumenCobro>>(new Map());
  /** Paquetes comerciales; el alta elige de aquí. */
  planesComerciales = signal<PlanPrecio[]>([]);

  /** Los retirados no se ofrecen en un alta, pero siguen vigentes en su ficha. */
  planesALaVenta = computed(() => this.planesComerciales().filter((p) => p.isActive));

  /**
   * El alta de un cliente vive en un diálogo. La edición de uno existente ya
   * no: se hace en su ficha, junto al resto de sus datos.
   */
  formAbierto = signal(false);
  form: NuevoTenant = { name: "", slug: "", plan: "BASIC", isActive: true };
  /**
   * Paquete elegido en el alta. Va aparte de `form` porque el endpoint de
   * tenants habla de niveles y el paquete se asigna por el de administración:
   * de él salen el nivel, el precio y los módulos.
   */
  planId = "";

  ngOnInit(): void {
    this.cargar();
    this.srv.catalogo().subscribe({
      next: (c) => this.catalogo.set(c.modules ?? []),
    });
    this.saas.planes().subscribe({
      next: (p) => {
        this.planesComerciales.set(p);
        // El alta arranca con un plan elegido: los planes llegan después de
        // pintar la pantalla, y sin esto el selector se queda en blanco.
        if (!this.planId) this.planId = this.planesALaVenta()[0]?.id ?? "";
      },
    });
  }

  /** Cómo se llama el paquete que tiene contratado, para verlo en la tabla. */
  planDe(t: Tenant): string {
    const p = this.planesComerciales().find((x) => x.id === t.saasPlanId);
    return p?.name ?? this.etiquetaPlan(t.plan);
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
        this.avisar("No se pudo cargar la lista de empresas", "error");
      },
    });
    this.saas.panorama().subscribe({ next: (p) => this.panorama.set(p) });
    this.saas.resumenCobros().subscribe({
      next: (r) => this.cobros.set(new Map(r.map((x) => [x.tenantId, x]))),
    });
  }

  /** Resumen de cobro del cliente, para la columna de pagos. */
  cobroDe(t: Tenant): ResumenCobro | undefined {
    return this.cobros().get(t.id);
  }

  /**
   * Módulos que el cliente tiene por encima de su plan (contratados aparte).
   * Un `enabledModules` nulo significa "solo lo del plan": sin extras.
   */
  extrasDe(t: Tenant): Modulo[] {
    const enabled = t.enabledModules;
    if (!enabled) return [];
    const tope = this.ordenPlan(t.plan);
    return this.catalogo().filter(
      (m) => enabled.includes(m.key) && this.ordenPlan(m.minPlan) > tope,
    );
  }

  // ─── Alta ───────────────────────────────────────────────────

  /** Marca si el admin ya tecleó el prefijo a mano (para no pisárselo). */
  private prefijoTocado = false;

  nuevo(): void {
    this.form = {
      name: "",
      slug: "",
      codePrefix: "",
      plan: "BASIC",
      isActive: true,
    };
    this.prefijoTocado = false;
    this.planId = this.planesALaVenta()[0]?.id ?? "";
    this.formAbierto.set(true);
  }

  cerrarForm(): void {
    this.formAbierto.set(false);
  }

  /** Alta guiada (wizard) en diálogo. */
  wizardAbierto = signal(false);
  abrirWizard(): void {
    this.wizardAbierto.set(true);
  }
  cerrarWizard(): void {
    this.wizardAbierto.set(false);
  }

  /** El identificador y el prefijo salen del nombre; se pueden corregir. */
  alEscribirNombre(): void {
    this.form.slug = this.form.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!this.prefijoTocado) {
      this.form.codePrefix = this.sugerirPrefijo(this.form.name);
    }
  }

  /** El admin editó el prefijo: se respeta y se normaliza a 3 letras. */
  alEscribirPrefijo(): void {
    this.prefijoTocado = true;
    this.form.codePrefix = (this.form.codePrefix ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3);
  }

  /**
   * Sugiere el prefijo de 3 letras (misma regla que el backend): con 3+
   * iniciales de palabras significativas se usan (Autos Premium Guadalajara →
   * APG); si no, las primeras 3 letras del nombre (Total Dealer → TOT).
   */
  private sugerirPrefijo(nombre: string): string {
    const limpio = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
    const conectores = new Set([
      "DE", "DEL", "LA", "LAS", "EL", "LOS", "Y",
      "SA", "CV", "SAPI", "SC", "SRL",
    ]);
    const palabras = (nombre ?? "")
      .split(/\s+/)
      .map(limpio)
      .filter((p) => p.length > 0);
    const significativas = palabras.filter((p) => !conectores.has(p));
    const iniciales = significativas.map((p) => p[0]).join("");
    const letras = palabras.join("");
    const base = iniciales.length >= 3 ? iniciales : letras;
    const pref = base.slice(0, 3);
    return pref.length ? pref.padEnd(3, "X") : "";
  }

  guardar(): void {
    if (!this.form.name.trim() || !this.form.slug.trim()) {
      this.avisar("Falta el nombre o el identificador", "error");
      return;
    }
    const plan = this.planesComerciales().find((p) => p.id === this.planId);
    if (!plan) {
      this.avisar("Elige el plan que contrata", "error");
      return;
    }
    // El nivel no se elige: lo dicta el paquete. Así el cliente no acaba con
    // un plan de un nivel y un permiso de otro.
    this.form.plan = plan.tier;

    this.guardando.set(true);
    this.srv.crear(this.form).subscribe({
      next: (t) => {
        // El paquete se asigna después de existir el cliente: es el paso que
        // le fija precio y módulos.
        this.saas.guardarFicha(t.id, { saasPlanId: plan.id }).subscribe({
          next: () => this.cargar(),
          error: () =>
            this.avisar("Se dio de alta la empresa, pero no su plan", "error"),
        });
        this.guardando.set(false);
        this.avisar("Empresa dada de alta");
        this.cerrarForm();
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
}
