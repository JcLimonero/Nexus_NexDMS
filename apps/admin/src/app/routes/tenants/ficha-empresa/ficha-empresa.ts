import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Barra } from "../../../shared/barra/barra";
import { Perfiles } from "../../perfiles/perfiles";
import { FichaUsuarios } from "../ficha-usuarios/ficha-usuarios";
import { FichaMarca } from "../ficha-marca/ficha-marca";
import { FichaSucursales } from "../ficha-sucursales/ficha-sucursales";
import { ConfirmService } from "../../../shared/services/confirm.service";
import { NotificacionService } from "../../../shared/services/notificacion.service";
import { EscDirective } from "../../../shared/directives/esc.directive";
import {
  CambioEstatus,
  Ficha,
  Modulo,
  PlanPrecio,
  PLANES,
  Pago,
  Plan,
  PrecioModulo,
  SaasService,
  Tenant,
  TenantsService,
} from "../tenants.service";

type Pestana = "datos" | "sucursales" | "pagos" | "marca" | "usuarios" | "perfiles";

/**
 * Ficha de una empresa (ruta `/tenants/:id`): quién es, qué paga, qué ha pagado,
 * su marca, sus sucursales, sus usuarios y sus roles a medida. Antes vivía como
 * diálogo dentro de la lista; ahora tiene URL propia (se puede compartir y
 * recargar). Módulos y suspensión, que solo se usan desde aquí, viven con ella.
 */
@Component({
  selector: "app-ficha-empresa",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Barra,
    Perfiles,
    FichaUsuarios,
    FichaMarca,
    FichaSucursales,
    EscDirective,
  ],
  templateUrl: "./ficha-empresa.html",
  styleUrls: ["./ficha-empresa.scss"],
})
export class FichaEmpresa implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private srv = inject(TenantsService);
  private saas = inject(SaasService);
  private confirm = inject(ConfirmService);
  private noti = inject(NotificacionService);

  readonly planes = PLANES;

  private id = "";
  cargando = signal(true);
  guardando = signal(false);
  ficha = signal<Ficha | null>(null);
  /** La empresa de la ficha (viene dentro de la ficha cargada). */
  tenant = computed<Tenant | null>(() => this.ficha()?.tenant ?? null);

  catalogo = signal<Modulo[]>([]);
  precios = signal<PrecioModulo[]>([]);
  planesComerciales = signal<PlanPrecio[]>([]);

  pestana = signal<Pestana>("datos");
  private tabsCargados = new Set<string>();

  datos = {
    name: "",
    slug: "",
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

  historial = signal<CambioEstatus[]>([]);
  copiado = signal<string | null>(null);

  // ── Módulos (diálogo sobre la ficha) ──
  moduloDe = signal<Tenant | null>(null);
  seleccion = signal<Set<string>>(new Set());

  modulosDelPlan = computed(() => {
    const t = this.moduloDe();
    if (!t) return [];
    const tope = this.ordenPlan(t.plan);
    return this.catalogo().filter((m) => this.ordenPlan(m.minPlan) <= tope);
  });

  modulosFueraDePlan = computed(() => {
    const t = this.moduloDe();
    if (!t) return [];
    const tope = this.ordenPlan(t.plan);
    return this.catalogo().filter((m) => this.ordenPlan(m.minPlan) > tope);
  });

  // ── Suspensión (diálogo sobre la ficha) ──
  suspensionDe = signal<Tenant | null>(null);
  motivoSuspension = signal("");

  ngOnInit(): void {
    this.srv.catalogo().subscribe({
      next: (c) => this.catalogo.set(c.modules ?? []),
    });
    this.saas.preciosDeModulos().subscribe({ next: (p) => this.precios.set(p) });
    this.saas.planes().subscribe({ next: (p) => this.planesComerciales.set(p) });
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (id) {
        this.id = id;
        this.cargar(id);
      }
    });
  }

  // ─── Carga de la ficha ──────────────────────────────────────

  cargar(id: string): void {
    this.cargando.set(true);
    this.pestana.set("datos");
    this.historial.set([]);
    this.tabsCargados.clear();
    this.tabsCargados.add("datos");
    this.cargarHistorial(id);
    this.saas.ficha(id).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.cargando.set(false);
        this.datos = {
          name: f.tenant.name,
          slug: f.tenant.slug,
          saasPlanId:
            f.tenant.saasPlanId ||
            this.planesComerciales().find((p) => p.key === f.tenant.plan)?.id ||
            "",
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
      error: () => {
        this.cargando.set(false);
        this.noti.error("No se pudo cargar la ficha");
      },
    });
  }

  private cargarHistorial(id: string): void {
    this.srv.historialEstatus(id).subscribe({
      next: (h) => this.historial.set(h),
      error: () => this.historial.set([]),
    });
  }

  private mesActual(): string {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  }

  cerrar(): void {
    void this.router.navigate(["/tenants"]);
  }

  verPestana(tab: Pestana): void {
    this.pestana.set(tab);
    if (this.tabsCargados.has(tab)) return;
    this.tabsCargados.add(tab);
    if (tab === "datos") this.cargarHistorial(this.id);
    // 'usuarios'/'marca'/'sucursales'/'perfiles' se autocargan en sus
    // componentes; 'pagos' viene en la ficha.
  }

  // ─── Helpers de plan/precio ─────────────────────────────────

  private ordenPlan(p: Plan): number {
    return this.planes.find((x) => x.value === p)?.orden ?? 0;
  }

  etiquetaPlan(p: Plan): string {
    return this.planes.find((x) => x.value === p)?.label ?? p;
  }

  precioDe(key: string): number {
    return this.precios().find((p) => p.key === key)?.monthlyPrice ?? 0;
  }

  copiar(texto: string): void {
    navigator.clipboard?.writeText(texto).then(
      () => {
        this.copiado.set(texto);
        setTimeout(() => this.copiado.set(null), 2000);
      },
      () => this.noti.error("No se pudo copiar"),
    );
  }

  entrar(t: Tenant): void {
    if (!t.isActive) {
      this.noti.error("La empresa está suspendida; reactívala para entrar");
      return;
    }
    const tab = window.open("", "_blank");
    this.srv.entrarComo(t.id).subscribe({
      next: (res) => {
        if (tab) tab.location.href = res.url;
        else window.location.href = res.url;
      },
      error: (err) => {
        tab?.close();
        this.noti.error(err?.error?.message || "No se pudo entrar a la empresa");
      },
    });
  }

  // ─── Datos y cobros ─────────────────────────────────────────

  guardarDatos(): void {
    const t = this.tenant();
    if (!t) return;
    this.guardando.set(true);
    this.saas
      .guardarFicha(t.id, {
        ...this.datos,
        billingDay: this.datos.billingDay || null,
        subscriptionStart: this.datos.subscriptionStart || null,
        saasPlanId: this.datos.saasPlanId || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.noti.ok("Datos de la empresa guardados");
          this.cargar(t.id);
        },
        error: (e) => {
          this.guardando.set(false);
          this.noti.error(e?.error?.message || "No se pudo guardar");
        },
      });
  }

  registrarPago(): void {
    const t = this.tenant();
    if (!t) return;
    if (!/^\d{4}-\d{2}$/.test(this.pago.period)) {
      this.noti.error("El periodo va como 2026-08");
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
          this.noti.ok(`Cobro de ${this.pago.period} registrado`);
          this.cargar(t.id);
          this.pestana.set("pagos");
        },
        error: (e) => {
          this.guardando.set(false);
          this.noti.error(e?.error?.message || "No se pudo registrar");
        },
      });
  }

  async eliminarPago(p: Pago): Promise<void> {
    const t = this.tenant();
    if (!t) return;
    const ok = await this.confirm.pedir({
      titulo: "Borrar cobro",
      mensaje: `¿Borrar el cobro de ${p.period}?`,
      confirmar: "Borrar",
      peligro: true,
    });
    if (!ok) return;
    this.saas.eliminarPago(p.id).subscribe({
      next: () => {
        this.noti.ok("Cobro eliminado");
        this.cargar(t.id);
        this.pestana.set("pagos");
      },
      error: () => this.noti.error("No se pudo eliminar"),
    });
  }

  // ─── Módulos ────────────────────────────────────────────────

  abrirModulos(t: Tenant): void {
    this.moduloDe.set(t);
    this.srv.modulosDe(t.id).subscribe({
      next: (r) => {
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
            this.noti.ok(`Módulos de ${t.name} actualizados`);
            this.cerrarModulos();
            this.cargar(t.id);
          },
          error: (e) => {
            this.guardando.set(false);
            this.noti.error(
              e?.error?.message || "No se pudieron contratar los extras",
            );
          },
        });
      },
      error: (e) => {
        this.guardando.set(false);
        this.noti.error(e?.error?.message || "No se pudo guardar");
      },
    });
  }

  // ─── Suspender / reactivar ──────────────────────────────────

  pedirSuspension(t: Tenant): void {
    this.suspensionDe.set(t);
    this.motivoSuspension.set("");
  }

  cerrarSuspension(): void {
    this.suspensionDe.set(null);
  }

  confirmarSuspension(): void {
    const t = this.suspensionDe();
    if (!t) return;
    const motivo = this.motivoSuspension().trim();
    if (!motivo) {
      this.noti.error("Escribe el motivo del cambio de estatus");
      return;
    }
    this.guardando.set(true);
    this.srv.suspender(t.id, motivo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.noti.ok(t.isActive ? "Empresa suspendida" : "Empresa reactivada");
        this.cerrarSuspension();
        this.cargar(t.id);
      },
      error: (e) => {
        this.guardando.set(false);
        this.noti.error(e?.error?.message || "No se pudo cambiar");
      },
    });
  }
}
