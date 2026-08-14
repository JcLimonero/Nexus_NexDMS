import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Barra } from "../../shared/barra/barra";
import {
  Ficha,
  Modulo,
  PlanPrecio,
  NuevoTenant,
  PLANES,
  Pago,
  Panorama,
  Plan,
  PrecioModulo,
  SaasService,
  Tenant,
  TenantsService,
} from "./tenants.service";

/**
 * Portal de administración del SaaS: los grupos que usan NexDMS.
 *
 * El alta, el plan y la suspensión viven en la pantalla; los datos del cliente
 * y sus cobros, en un diálogo aparte: se consultan de vez en cuando y son
 * demasiados para meterlos en una fila de la tabla.
 */
@Component({
  selector: "app-tenants",
  standalone: true,
  imports: [CommonModule, FormsModule, Barra],
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
  precios = signal<PrecioModulo[]>([]);
  /** Paquetes comerciales; el alta y la ficha eligen de aquí. */
  planesComerciales = signal<PlanPrecio[]>([]);

  /** Los retirados no se ofrecen en un alta, pero siguen vigentes en su ficha. */
  planesALaVenta = computed(() => this.planesComerciales().filter((p) => p.isActive));

  /** Tenant en edición; null = alta nueva. */
  editando = signal<Tenant | null>(null);
  form: NuevoTenant = { name: "", slug: "", plan: "BASIC", isActive: true };
  /**
   * Paquete elegido en el alta. Va aparte de `form` porque el endpoint de
   * tenants habla de niveles y el paquete se asigna por el de administración:
   * de él salen el nivel, el precio y los módulos.
   */
  planId = "";

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
    this.saas.preciosDeModulos().subscribe({ next: (p) => this.precios.set(p) });
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

  /** Lo que cuesta al mes un módulo fuera de plan, para poder ofrecerlo. */
  precioDe(key: string): number {
    return this.precios().find((p) => p.key === key)?.monthlyPrice ?? 0;
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
    this.saas.panorama().subscribe({ next: (p) => this.panorama.set(p) });
  }

  // ─── Alta y edición ─────────────────────────────────────────

  nuevo(): void {
    this.editando.set(null);
    this.form = { name: "", slug: "", plan: "BASIC", isActive: true };
    this.planId = this.planesALaVenta()[0]?.id ?? "";
  }

  editar(t: Tenant): void {
    this.editando.set(t);
    this.form = {
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      isActive: t.isActive,
    };
    this.planId = t.saasPlanId ?? "";
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
    const plan = this.planesComerciales().find((p) => p.id === this.planId);
    if (!plan) {
      this.avisar("Elige el plan que contrata", "error");
      return;
    }
    // El nivel no se elige: lo dicta el paquete. Así el cliente no acaba con
    // un plan de un nivel y un permiso de otro.
    this.form.plan = plan.tier;

    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.srv.actualizar(actual.id, this.form)
      : this.srv.crear(this.form);
    peticion.subscribe({
      next: (t) => {
        // El paquete se asigna después de existir el cliente: es el paso que
        // le fija precio y módulos.
        this.saas.guardarFicha(t.id, { saasPlanId: plan.id }).subscribe({
          next: () => this.cargar(),
          error: () =>
            this.avisar("Se guardó el cliente, pero no su plan", "error"),
        });
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

  /**
   * Guarda los módulos en dos pasos porque son dos decisiones distintas: los
   * del plan se encienden o apagan, y los de fuera se contratan (y se cobran).
   * Primero la lista del plan y después los extras, porque el segundo parte de
   * lo que dejó el primero.
   */
  guardarModulos(): void {
    const t = this.moduloDe();
    if (!t) return;
    this.guardando.set(true);

    const dentro = new Set<string>();
    for (const m of this.modulosDelPlan()) {
      if (m.core || this.seleccion().has(m.key)) dentro.add(m.key);
    }
    const extras = this.modulosFueraDePlan()
      .filter((m) => this.seleccion().has(m.key))
      .map((m) => m.key);

    this.srv.guardarModulos(t.id, [...dentro]).subscribe({
      next: () => {
        this.saas.guardarFicha(t.id, { extraModules: extras }).subscribe({
          next: () => {
            this.guardando.set(false);
            this.avisar(`Módulos de ${t.name} actualizados`);
            this.cerrarModulos();
            this.cargar();
          },
          error: (e) => {
            this.guardando.set(false);
            this.avisar(
              e?.error?.message || "No se pudieron contratar los extras",
              "error",
            );
          },
        });
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

  // ─── Ficha del cliente ──────────────────────────────────────

  /** Cliente cuya ficha se está viendo; null = ninguna abierta. */
  fichaDe = signal<Tenant | null>(null);
  ficha = signal<Ficha | null>(null);
  /** Qué se ve dentro de la ficha: sus datos o sus cobros. */
  pestana = signal<"datos" | "pagos">("datos");

  datos = {
    saasPlanId: "" as string | null,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    rfc: "",
    billingEmail: "",
    address: "",
    notes: "",
    subscriptionStart: "",
    billingDay: null as number | null,
  };

  pago = {
    period: "",
    amount: 0,
    status: "PAGADO" as Pago["status"],
    dueDate: "",
    method: "",
    reference: "",
    concept: "",
  };

  abrirFicha(t: Tenant): void {
    this.fichaDe.set(t);
    this.ficha.set(null);
    this.pestana.set("datos");
    this.saas.ficha(t.id).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.datos = {
          saasPlanId: f.tenant.saasPlanId ?? "",
          contactName: f.tenant.contactName ?? "",
          contactEmail: f.tenant.contactEmail ?? "",
          contactPhone: f.tenant.contactPhone ?? "",
          rfc: f.tenant.rfc ?? "",
          billingEmail: f.tenant.billingEmail ?? "",
          address: f.tenant.address ?? "",
          notes: f.tenant.notes ?? "",
          subscriptionStart: f.tenant.subscriptionStart ?? "",
          billingDay: f.tenant.billingDay,
        };
        // El cobro nuevo se propone con el mes en curso y lo que le toca
        // pagar: lo habitual es confirmarlo, no capturarlo entero.
        this.pago = {
          period: this.mesActual(),
          amount: f.cobro.total,
          status: "PAGADO",
          dueDate: "",
          method: "TRANSFERENCIA",
          reference: "",
          concept: "",
        };
      },
      error: () => this.avisar("No se pudo cargar la ficha", "error"),
    });
  }

  private mesActual(): string {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  }

  cerrarFicha(): void {
    this.fichaDe.set(null);
    this.ficha.set(null);
  }

  guardarDatos(): void {
    const t = this.fichaDe();
    if (!t) return;
    this.guardando.set(true);
    this.saas
      .guardarFicha(t.id, {
        ...this.datos,
        // El día de cobro vacío es "sin definir", no el día cero.
        billingDay: this.datos.billingDay || null,
        subscriptionStart: this.datos.subscriptionStart || null,
        saasPlanId: this.datos.saasPlanId || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisar("Datos del cliente guardados");
          this.abrirFicha(t);
        },
        error: (e) => {
          this.guardando.set(false);
          this.avisar(e?.error?.message || "No se pudo guardar", "error");
        },
      });
  }

  registrarPago(): void {
    const t = this.fichaDe();
    if (!t) return;
    if (!/^\d{4}-\d{2}$/.test(this.pago.period)) {
      this.avisar("El periodo va como 2026-08", "error");
      return;
    }
    this.guardando.set(true);
    this.saas
      .registrarPago(t.id, {
        ...this.pago,
        amount: Number(this.pago.amount),
        dueDate: this.pago.dueDate || null,
        method: this.pago.method || null,
        reference: this.pago.reference || null,
        concept: this.pago.concept || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisar(`Cobro de ${this.pago.period} registrado`);
          this.abrirFicha(t);
          this.pestana.set("pagos");
        },
        error: (e) => {
          this.guardando.set(false);
          this.avisar(e?.error?.message || "No se pudo registrar", "error");
        },
      });
  }

  eliminarPago(p: Pago): void {
    const t = this.fichaDe();
    if (!t || !confirm(`¿Borrar el cobro de ${p.period}?`)) return;
    this.saas.eliminarPago(p.id).subscribe({
      next: () => {
        this.avisar("Cobro eliminado");
        this.abrirFicha(t);
        this.pestana.set("pagos");
      },
      error: () => this.avisar("No se pudo eliminar", "error"),
    });
  }
}
