import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Barra } from "../../shared/barra/barra";
import {
  Modulo,
  PLANES,
  Panorama,
  Plan,
  PlanPrecio,
  PrecioModulo,
  SaasService,
  TenantsService,
} from "../tenants/tenants.service";

/**
 * Lo que cuesta NexDMS: los paquetes que se venden y el precio de los módulos
 * que se contratan aparte.
 *
 * Se editan juntos porque se deciden juntos: cuánto vale un paquete depende de
 * cuánto valga comprar sus módulos sueltos.
 */
@Component({
  selector: "app-precios",
  standalone: true,
  imports: [CommonModule, FormsModule, Barra],
  templateUrl: "./precios.html",
  styleUrls: ["./precios.scss"],
})
export class Precios implements OnInit {
  private srv = inject(SaasService);
  private tenantsSrv = inject(TenantsService);

  readonly niveles = PLANES;

  cargando = signal(true);
  guardando = signal<string | null>(null);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);

  panorama = signal<Panorama | null>(null);
  planes = signal<PlanPrecio[]>([]);
  modulos = signal<PrecioModulo[]>([]);
  catalogo = signal<Modulo[]>([]);

  /**
   * Los de núcleo no se listan como venta suelta: van en todos los niveles y
   * no se pueden apagar, así que ponerles precio sería ofrecer algo que nadie
   * puede comprar ni dejar de tener.
   */
  modulosVendibles = computed(() => this.modulos().filter((m) => !m.core));

  /** Plan que se está componiendo; null = no hay alta abierta. */
  nuevo = signal<Partial<PlanPrecio> | null>(null);
  /** Plan cuyos módulos se están eligiendo. */
  modulosDe = signal<PlanPrecio | null>(null);
  seleccion = signal<Set<string>>(new Set());

  /** Todos los módulos del catálogo: un plan a la medida puede incluir
   * cualquiera, sin importar el nivel técnico de origen. */
  modulosDelNivel = computed(() => {
    const p = this.modulosDe();
    if (!p) return [];
    return this.catalogo();
  });

  ngOnInit(): void {
    this.cargar();
    this.tenantsSrv
      .catalogo()
      .subscribe({ next: (c) => this.catalogo.set(c.modules ?? []) });
  }

  private orden(p: Plan): number {
    return this.niveles.find((x) => x.value === p)?.orden ?? 0;
  }

  etiquetaNivel(p: Plan): string {
    return this.niveles.find((x) => x.value === p)?.label ?? p;
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 4000);
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.panorama().subscribe({ next: (p) => this.panorama.set(p) });
    this.srv.planes().subscribe({
      next: (p) => {
        this.planes.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.avisar("No se pudieron cargar los planes", "error");
      },
    });
    this.srv.preciosDeModulos().subscribe({ next: (m) => this.modulos.set(m) });
  }

  /** El ingreso mensual depende de estas tarifas: se relee tras cada cambio. */
  private releerPanorama(): void {
    this.srv.panorama().subscribe({ next: (x) => this.panorama.set(x) });
  }

  // ─── Alta ───────────────────────────────────────────────────

  abrirAlta(): void {
    this.nuevo.set({
      key: "",
      name: "",
      tier: "BASIC",
      description: "",
      monthlyPrice: 0,
      sortOrder: this.planes().length + 1,
    });
  }

  cerrarAlta(): void {
    this.nuevo.set(null);
  }

  /** La clave sale del nombre; se puede corregir a mano antes de guardar. */
  alEscribirNombre(): void {
    const n = this.nuevo();
    if (!n) return;
    this.nuevo.set({
      ...n,
      key: (n.name ?? "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 20),
    });
  }

  crear(): void {
    const n = this.nuevo();
    if (!n) return;
    this.guardando.set("nuevo");
    this.srv
      .crearPlan({ ...n, monthlyPrice: Number(n.monthlyPrice) })
      .subscribe({
        next: (p) => {
          this.guardando.set(null);
          this.avisar(`Plan ${p.name} creado`);
          this.cerrarAlta();
          this.cargar();
          // Se abre en seguida la elección de módulos: un plan sin definir qué
          // entrega da todo su nivel, que casi nunca es lo que se quería.
          this.abrirModulos(p);
        },
        error: (e) => {
          this.guardando.set(null);
          this.avisar(e?.error?.message || "No se pudo crear", "error");
        },
      });
  }

  // ─── Edición ────────────────────────────────────────────────

  guardarPlan(p: PlanPrecio): void {
    this.guardando.set(p.id);
    this.srv
      .guardarPlan(p.id, {
        name: p.name,
        description: p.description,
        monthlyPrice: Number(p.monthlyPrice),
        isActive: p.isActive,
        tier: p.tier,
      })
      .subscribe({
        next: () => {
          this.guardando.set(null);
          this.avisar(`Plan ${p.name} actualizado`);
          this.releerPanorama();
        },
        error: (e) => {
          this.guardando.set(null);
          this.avisar(e?.error?.message || "No se pudo guardar", "error");
        },
      });
  }

  eliminar(p: PlanPrecio): void {
    if (!confirm(`¿Borrar el plan ${p.name}?`)) return;
    this.srv.eliminarPlan(p.id).subscribe({
      next: () => {
        this.avisar(`Plan ${p.name} borrado`);
        this.cargar();
      },
      error: (e) =>
        this.avisar(e?.error?.message || "No se pudo borrar", "error"),
    });
  }

  // ─── Qué incluye el plan ────────────────────────────────────

  abrirModulos(p: PlanPrecio): void {
    this.modulosDe.set(p);
    const tope = this.orden(p.tier);
    // Sin lista propia el plan entrega todo su nivel: se marca completo para
    // que se vea el estado real y no una lista vacía.
    const todos = this.catalogo()
      .filter((m) => this.orden(m.minPlan) <= tope)
      .map((m) => m.key);
    this.seleccion.set(new Set(p.includedModules ?? todos));
  }

  cerrarModulos(): void {
    this.modulosDe.set(null);
  }

  incluido(m: Modulo): boolean {
    return m.core || this.seleccion().has(m.key);
  }

  alternar(m: Modulo): void {
    if (m.core) return;
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(m.key)) n.delete(m.key);
      else n.add(m.key);
      return n;
    });
  }

  guardarModulos(): void {
    const p = this.modulosDe();
    if (!p) return;
    this.guardando.set(p.id);
    const claves = new Set(this.seleccion());
    for (const m of this.modulosDelNivel()) if (m.core) claves.add(m.key);
    this.srv.guardarPlan(p.id, { includedModules: [...claves] }).subscribe({
      next: () => {
        this.guardando.set(null);
        this.avisar(`Contenido de ${p.name} actualizado`);
        this.cerrarModulos();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(null);
        this.avisar(e?.error?.message || "No se pudo guardar", "error");
      },
    });
  }

  /** Cuántos módulos entrega el plan, para verlo sin abrir el diálogo. */
  cuantosIncluye(p: PlanPrecio): number {
    const tope = this.orden(p.tier);
    return (
      p.includedModules?.length ??
      this.catalogo().filter((m) => this.orden(m.minPlan) <= tope).length
    );
  }

  // ─── Precio por módulo ──────────────────────────────────────

  guardarModulo(m: PrecioModulo): void {
    this.guardando.set(m.key);
    this.srv.guardarPrecioModulo(m.key, Number(m.monthlyPrice)).subscribe({
      next: () => {
        this.guardando.set(null);
        this.avisar(`Precio de ${m.name} actualizado`);
        this.releerPanorama();
      },
      error: (e) => {
        this.guardando.set(null);
        this.avisar(e?.error?.message || "No se pudo guardar", "error");
      },
    });
  }
}
