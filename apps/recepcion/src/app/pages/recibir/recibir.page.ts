import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import {
  DatosUnidad,
  MARK_TYPES,
  Reception,
  ReceptionPhoto,
  RecepcionFlujoService,
  ServicioPredefinido,
  TIPOS_UNIDAD,
} from "../../core/recepcion-flujo.service";

interface LineaCotizacion {
  description: string;
  quantity: number;
  unitPrice: number;
}

type Paso = "unidad" | "estado" | "fotos" | "cotizacion";

type MarkShape = "POINT" | "CIRCLE";

interface MarcaPendiente {
  x: number;
  y: number;
  shape: MarkShape;
  /** Nulo en un punto. En un área, fracción del ANCHO de la foto. */
  radius: number | null;
}

/**
 * Radio mínimo de un área, en fracción del ancho de la foto.
 *
 * Un toque sin arrastre en modo área daría radio cero, es decir un círculo
 * invisible. Con este mínimo el toque simple deja un área pequeña que después
 * se puede rehacer, en vez de una marca que no se ve y que nadie sabe borrar.
 */
const RADIO_MINIMO = 0.04;

/**
 * ⚠️ La misma recepción existe embebida en el DMS:
 * `apps/web/src/app/features/taller/recepcion/recepcion-page.ts`.
 * Se mantienen las dos a propósito; si cambias el flujo aquí, revisa allá.
 */
/**
 * Recepción de una unidad, de principio a fin.
 *
 * Los cuatro pasos van en la misma pantalla y no en rutas separadas: el asesor
 * hace esto con la unidad delante y el cliente esperando, así que perder el
 * avance por una navegación sería caro. El paso se marca como completado en
 * cuanto el backend confirma, nunca antes.
 */
@Component({
  selector: "app-recibir",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./recibir.page.html",
  styleUrls: ["./recibir.page.scss"],
})
export class RecibirPage implements OnInit {
  private srv = inject(RecepcionFlujoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly markTypes = MARK_TYPES;
  readonly tiposUnidad = TIPOS_UNIDAD;

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);
  paso = signal<Paso>("estado");

  /** Cita de origen cuando aún no hay orden abierta. */
  citaId = signal<string | null>(null);
  recepcion = signal<Reception | null>(null);

  // ── Alta de unidad (citas del bot, que llegan sin vehículo) ──
  unidad: DatosUnidad = {
    vehicleType: "MOTORCYCLE",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    plate: "",
    vin: "",
    mileage: 0,
    color: "",
  };

  // ── Estado de la unidad ──
  checklist = {
    kmIn: 0,
    fuelLevel: 50,
    hasSpareTire: false,
    hasTools: false,
    hasDocuments: false,
    hasMats: false,
    observations: "",
    damageDescription: "",
  };

  // ── Marcado sobre la foto ──
  fotoActiva = signal<ReceptionPhoto | null>(null);
  /**
   * Se entra en "ver" a propósito: esta ficha se abre muchas más veces para
   * consultar los daños que para agregar uno, y con la tableta en la mano un
   * roce sobre la foto no debe inventar un daño.
   */
  modo = signal<"ver" | "marcar">("ver");
  marcando = computed(() => this.modo() === "marcar");
  herramienta = signal<MarkShape>("POINT");
  /** Marca que se resalta a la vez en la foto y en la lista. */
  marcaResaltada = signal<string | null>(null);
  marcaPendiente = signal<MarcaPendiente | null>(null);
  marcaTipo = "SCRATCH";
  marcaNota = "";
  /** Caja de la foto durante el arrastre, para no medirla en cada movimiento. */
  private cajaFoto: DOMRect | null = null;
  private arrastrando = false;

  // ── Cotización ──
  servicios = signal<ServicioPredefinido[]>([]);
  lineas = signal<LineaCotizacion[]>([]);
  condiciones = "";

  pendientes = computed(() => this.recepcion()?.pendientes ?? []);
  total = computed(() =>
    this.lineas().reduce((a, l) => a + l.quantity * l.unitPrice, 0),
  );

  ngOnInit(): void {
    const orden = this.route.snapshot.paramMap.get("ordenId");
    const cita = this.route.snapshot.queryParamMap.get("cita");

    if (orden) {
      this.abrirOrden(orden);
    } else if (cita) {
      this.citaId.set(cita);
      // Se intenta abrir directo; si la cita no trae unidad, el backend lo
      // dice y se pide capturarla antes de seguir.
      this.recibirCita();
    } else {
      this.cargando.set(false);
      this.avisar("No se indicó qué recibir", "error");
    }
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 4000);
  }

  private mensaje(e: unknown, porDefecto: string): string {
    const err = e as { error?: { message?: string | string[] } };
    const m = err?.error?.message;
    return Array.isArray(m) ? m[0] : (m ?? porDefecto);
  }

  volver(): void {
    void this.router.navigate(["/"]);
  }

  // ─── Apertura ───────────────────────────────────────────────

  private recibirCita(datos?: { vehiculo: DatosUnidad }): void {
    const cita = this.citaId();
    if (!cita) return;
    this.guardando.set(true);
    this.srv.recibirCita(cita, datos).subscribe({
      next: (orden) => {
        this.guardando.set(false);
        this.abrirOrden(orden.id);
      },
      error: (e) => {
        this.guardando.set(false);
        this.cargando.set(false);
        const texto = this.mensaje(e, "No se pudo abrir la recepción");
        // El backend pide los datos de la unidad cuando la cita viene del bot.
        if (texto.toLowerCase().includes("unidad")) {
          this.paso.set("unidad");
        } else {
          this.avisar(texto, "error");
        }
      },
    });
  }

  altaUnidad(): void {
    if (!this.unidad.make.trim() || !this.unidad.model.trim()) {
      this.avisar("Captura al menos marca y modelo", "error");
      return;
    }
    this.recibirCita({ vehiculo: this.unidad });
  }

  private abrirOrden(serviceOrderId: string): void {
    this.cargando.set(true);
    this.srv.get(serviceOrderId).subscribe({
      next: (r) => {
        this.recepcion.set(r);
        this.checklist = {
          kmIn: r.checklist?.kmIn ?? r.serviceOrder.kmIn ?? 0,
          fuelLevel: r.checklist?.fuelLevel ?? 50,
          hasSpareTire: r.checklist?.hasSpareTire ?? false,
          hasTools: r.checklist?.hasTools ?? false,
          hasDocuments: r.checklist?.hasDocuments ?? false,
          hasMats: r.checklist?.hasMats ?? false,
          observations: r.checklist?.observations ?? "",
          damageDescription: r.checklist?.damageDescription ?? "",
        };
        // Si el estado ya se guardó antes, se retoma donde quedó.
        this.paso.set(r.checklist ? "fotos" : "estado");
        this.cargando.set(false);
        this.cargarServicios();
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisar(this.mensaje(e, "No se pudo cargar la recepción"), "error");
      },
    });
  }

  private cargarServicios(): void {
    this.srv.serviciosPredefinidos().subscribe({
      next: (s) => this.servicios.set(s),
    });
  }

  // ─── Estado de la unidad ────────────────────────────────────

  guardarEstado(): void {
    const r = this.recepcion();
    if (!r || this.guardando()) return;
    this.guardando.set(true);
    this.srv.saveChecklist(r.serviceOrder.id, this.checklist).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar("Estado registrado");
        this.paso.set("fotos");
        this.refrescar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisar(this.mensaje(e, "No se pudo guardar"), "error");
      },
    });
  }

  private refrescar(): void {
    const r = this.recepcion();
    if (!r) return;
    this.srv.get(r.serviceOrder.id).subscribe({
      next: (nueva) => {
        this.recepcion.set(nueva);
        const activa = this.fotoActiva();
        if (activa) {
          this.fotoActiva.set(
            nueva.fotos.find((f) => f.id === activa.id) ?? null,
          );
        }
      },
    });
  }

  // ─── Fotos ──────────────────────────────────────────────────

  fotoDe(code: string): ReceptionPhoto | undefined {
    return this.recepcion()?.fotos.find((f) => f.specCode === code);
  }

  onArchivo(event: Event, specCode: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const r = this.recepcion();
    if (!file || !r) return;
    this.guardando.set(true);
    this.srv.uploadMedia(r.serviceOrder.id, specCode, file).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar("Foto capturada");
        this.refrescar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisar(this.mensaje(e, "No se pudo subir"), "error");
      },
    });
    input.value = "";
  }

  abrirMarcado(foto: ReceptionPhoto): void {
    this.fotoActiva.set(foto);
    this.marcaPendiente.set(null);
    this.marcaResaltada.set(null);
    this.modo.set("ver");
  }

  cerrarMarcado(): void {
    this.fotoActiva.set(null);
    this.marcaPendiente.set(null);
    this.marcaResaltada.set(null);
  }

  /** Vuelve a solo lectura y descarta lo que se estuviera dibujando. */
  verMarcas(): void {
    this.modo.set("ver");
    this.marcaPendiente.set(null);
  }

  cambiarHerramienta(h: MarkShape): void {
    this.herramienta.set(h);
    this.marcaPendiente.set(null);
  }

  /** Nombre del catálogo, que dice más que el código de la foto. */
  nombreSpec(code: string | null): string {
    return (
      this.recepcion()?.specs.find((s) => s.code === code)?.name ?? code ?? ""
    );
  }

  /** Posición del dedo como fracción del ancho y del alto de la foto. */
  private relativo(ev: PointerEvent, caja: DOMRect): { x: number; y: number } {
    return {
      x: Math.min(1, Math.max(0, (ev.clientX - caja.left) / caja.width)),
      y: Math.min(1, Math.max(0, (ev.clientY - caja.top) / caja.height)),
    };
  }

  onPointerDown(ev: PointerEvent): void {
    if (!this.marcando()) return;
    const lienzo = ev.currentTarget as HTMLElement;
    this.cajaFoto = lienzo.getBoundingClientRect();
    const p = this.relativo(ev, this.cajaFoto);
    this.arrastrando = true;
    // Con captura el arrastre sigue vivo aunque el dedo se salga de la foto:
    // sin ella el círculo se congela justo cuando se quiere agrandar del todo.
    // Puede fallar si el dedo ya se levantó, y entonces no vale la pena
    // abortar el marcado por eso.
    try {
      lienzo.setPointerCapture(ev.pointerId);
    } catch {
      /* el arrastre sigue funcionando sin captura */
    }
    this.marcaPendiente.set({
      x: p.x,
      y: p.y,
      shape: this.herramienta(),
      radius: this.herramienta() === "CIRCLE" ? RADIO_MINIMO : null,
    });
    this.marcaNota = "";
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.arrastrando || this.herramienta() !== "CIRCLE") return;
    const centro = this.marcaPendiente();
    const caja = this.cajaFoto;
    if (!centro || !caja) return;
    const p = this.relativo(ev, caja);
    // El radio se mide sobre el ancho para que el círculo salga redondo, así
    // que la distancia vertical —que viene en fracción del alto— hay que
    // pasarla a fracción del ancho antes de componerla con la horizontal.
    const dx = p.x - centro.x;
    const dy = (p.y - centro.y) * (caja.height / caja.width);
    this.marcaPendiente.set({
      ...centro,
      radius: Math.min(1, Math.max(RADIO_MINIMO, Math.hypot(dx, dy))),
    });
  }

  onPointerUp(): void {
    this.arrastrando = false;
    this.cajaFoto = null;
  }

  confirmarMarca(): void {
    const foto = this.fotoActiva();
    const pos = this.marcaPendiente();
    if (!foto || !pos) return;
    this.guardando.set(true);
    this.srv
      .addMark(foto.id, {
        type: this.marcaTipo,
        shape: pos.shape,
        note: this.marcaNota || undefined,
        x: pos.x,
        y: pos.y,
        radius: pos.radius ?? undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.marcaPendiente.set(null);
          this.marcaNota = "";
          this.refrescar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.avisar(this.mensaje(e, "No se pudo marcar"), "error");
        },
      });
  }

  quitarMarca(markId: string): void {
    this.srv.removeMark(markId).subscribe({ next: () => this.refrescar() });
  }

  etiquetaMarca(tipo: string): string {
    return MARK_TYPES.find((m) => m.value === tipo)?.label ?? tipo;
  }

  irACotizar(): void {
    if (this.pendientes().length) {
      this.avisar(
        `Faltan fotos obligatorias: ${this.pendientes().join(", ")}`,
        "error",
      );
      return;
    }
    this.paso.set("cotizacion");
  }

  // ─── Cotización ─────────────────────────────────────────────

  agregarServicio(s: ServicioPredefinido): void {
    this.lineas.update((l) => [
      ...l,
      { description: s.name, quantity: 1, unitPrice: s.price ?? 0 },
    ]);
  }

  agregarLinea(): void {
    this.lineas.update((l) => [
      ...l,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  quitarLinea(i: number): void {
    this.lineas.update((l) => l.filter((_, idx) => idx !== i));
  }

  enviarCotizacion(): void {
    const r = this.recepcion();
    const lineas = this.lineas().filter((l) => l.description.trim());
    if (!r || !lineas.length) {
      this.avisar("Agrega al menos un servicio", "error");
      return;
    }
    this.guardando.set(true);
    this.srv.cotizar(r.serviceOrder.id, lineas, this.condiciones).subscribe({
      next: (q) => {
        this.guardando.set(false);
        this.avisar(`Cotización ${q.folio} enviada al cliente`);
        // Se vuelve a la agenda: la unidad ya quedó recibida y lo siguiente
        // depende del cliente, no del asesor.
        setTimeout(() => this.volver(), 1500);
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisar(this.mensaje(e, "No se pudo cotizar"), "error");
      },
    });
  }

  dinero(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
}
