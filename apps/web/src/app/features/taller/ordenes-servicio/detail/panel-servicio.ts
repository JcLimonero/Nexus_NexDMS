import {
  Component,
  ElementRef,
  Input,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

import {
  Firma,
  Hallazgo,
  Mensaje,
  Operacion,
  PanelServicioService,
  TipoCargo,
} from "./panel-servicio.service";

interface LineaCotizacion {
  description: string;
  quantity: number;
  unitPrice: number;
}

type Pestana = "trabajos" | "adicionales" | "firmas" | "mensajes";

/**
 * Panel de trabajo de la orden abierta.
 *
 * Va aparte del detalle porque son cinco flujos distintos que el asesor usa
 * en momentos distintos del servicio, y meterlos todos en la misma pantalla
 * dejaría una página imposible de recorrer.
 */
@Component({
  selector: "app-panel-servicio",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./panel-servicio.html",
  styleUrls: ["./panel-servicio.scss"],
})
export class PanelServicio implements OnInit {
  @Input({ required: true }) serviceOrderId!: string;

  private srv = inject(PanelServicioService);
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  pestana = signal<Pestana>("trabajos");
  cargando = signal(false);
  guardando = signal(false);

  // ── Operaciones ──
  operaciones = signal<Operacion[]>([]);
  tiposCargo = signal<TipoCargo[]>([]);
  productividad = signal<{
    minutosBaremo: number;
    minutosReales: number;
    eficiencia: number | null;
  } | null>(null);
  nuevaOp = {
    code: "",
    description: "",
    standardMinutes: 60,
    laborPrice: 0,
    chargeType: "CLIENT",
    chargeAccount: "",
    noCommission: false,
    commissionOverride: null as number | null,
  };

  // ── Trabajos adicionales ──
  hallazgos = signal<Hallazgo[]>([]);
  seleccionados = signal<Set<string>>(new Set());
  lineas = signal<LineaCotizacion[]>([]);
  condiciones = "";
  /** Miniaturas firmadas del almacenamiento, por clave. */
  urls = signal<Record<string, string>>({});

  pendientes = computed(() =>
    this.hallazgos().filter((h) => h.status === "PENDIENTE"),
  );
  totalCotizacion = computed(() =>
    this.lineas().reduce((a, l) => a + l.quantity * l.unitPrice, 0),
  );

  // ── Firmas ──
  firmas = signal<Firma[]>([]);
  firmaActiva = signal<Firma | null>(null);
  firmanteNombre = "";
  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>("pad");
  private dibujando = false;
  private hayTrazo = false;

  // ── Mensajes ──
  mensajes = signal<Mensaje[]>([]);
  nuevoMensaje = "";
  sinLeer = computed(
    () => this.mensajes().filter((m) => m.sender === "CLIENT" && !m.leido).length,
  );

  ngOnInit(): void {
    this.cargar();
    this.srv.tiposCargo().subscribe({ next: (t) => this.tiposCargo.set(t) });
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.operaciones(this.serviceOrderId).subscribe({
      next: (o) => {
        this.operaciones.set(o);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.srv.productividad(this.serviceOrderId).subscribe({
      next: (p) => this.productividad.set(p),
    });
    this.srv.hallazgos(this.serviceOrderId).subscribe({
      next: (h) => {
        this.hallazgos.set(h);
        for (const x of h) this.cargarMiniatura(x.mediaKey);
      },
    });
    this.srv.firmas(this.serviceOrderId).subscribe({
      next: (f) => this.firmas.set(f),
    });
    this.srv.mensajes(this.serviceOrderId).subscribe({
      next: (m) => this.mensajes.set(m),
    });
  }

  ir(p: Pestana): void {
    this.pestana.set(p);
  }

  // ─── Operaciones ────────────────────────────────────────────

  agregarOperacion(): void {
    if (!this.nuevaOp.description.trim() || this.guardando()) return;
    this.guardando.set(true);
    this.srv.agregarOperacion(this.serviceOrderId, this.nuevaOp).subscribe({
      next: () => {
        this.guardando.set(false);
        this.nuevaOp = {
          code: "",
          description: "",
          standardMinutes: 60,
          laborPrice: 0,
          chargeType: "CLIENT",
          chargeAccount: "",
          noCommission: false,
          commissionOverride: null,
        };
        this.toastr.success("Operación agregada");
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo agregar");
      },
    });
  }

  quitarOperacion(op: Operacion): void {
    this.srv.quitarOperacion(op.id).subscribe({
      next: () => {
        this.toastr.success("Operación eliminada");
        this.cargar();
      },
      // El backend no deja borrar una operación ya fichada; se muestra el
      // motivo tal cual en vez de un error genérico.
      error: (e) => this.toastr.error(e?.error?.message || "No se pudo quitar"),
    });
  }

  etiquetaCargo(valor: string): string {
    return this.tiposCargo().find((t) => t.value === valor)?.label ?? valor;
  }

  hm(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  // ─── Trabajos adicionales ───────────────────────────────────

  /** El almacenamiento es privado: la miniatura se pide firmada. */
  private cargarMiniatura(key: string): void {
    if (!key || this.urls()[key]) return;
    this.http
      .get<{ url: string }>("/api/v1/storage/signed-url", {
        params: { key },
      })
      .subscribe({
        next: (r) => this.urls.update((u) => ({ ...u, [key]: r.url })),
        // Sin credenciales de almacenamiento la miniatura no carga; el
        // hallazgo sigue siendo cotizable, así que no se estorba al asesor.
        error: () => undefined,
      });
  }

  alternarSeleccion(h: Hallazgo): void {
    this.seleccionados.update((s) => {
      const n = new Set(s);
      if (n.has(h.id)) n.delete(h.id);
      else n.add(h.id);
      return n;
    });
    this.sugerirLineas();
  }

  /**
   * Precarga el presupuesto con lo que el técnico estimó. El asesor ajusta
   * precios, pero no debería empezar de una hoja en blanco.
   */
  private sugerirLineas(): void {
    const elegidos = this.pendientes().filter((h) =>
      this.seleccionados().has(h.id),
    );
    this.lineas.set(
      elegidos.map((h) => ({
        description: h.description,
        quantity: 1,
        unitPrice: h.estimatedAmount || 0,
      })),
    );
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
    const ids = [...this.seleccionados()];
    const lineas = this.lineas().filter(
      (l) => l.description.trim() && l.unitPrice >= 0,
    );
    if (!ids.length) {
      this.toastr.warning("Elige al menos un trabajo adicional");
      return;
    }
    if (!lineas.length) {
      this.toastr.warning("El presupuesto necesita conceptos");
      return;
    }
    this.guardando.set(true);
    this.srv
      .cotizarHallazgos(this.serviceOrderId, ids, lineas, this.condiciones)
      .subscribe({
        next: (q) => {
          this.guardando.set(false);
          this.seleccionados.set(new Set());
          this.lineas.set([]);
          this.condiciones = "";
          this.toastr.success(
            `Presupuesto ${q.folio} enviado al cliente para autorización`,
          );
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo cotizar");
        },
      });
  }

  tonoCriticidad(c: string): string {
    return c === "ALTA" ? "danger" : c === "MEDIA" ? "warning" : "muted";
  }

  // ─── Firmas ─────────────────────────────────────────────────

  abrirPad(f: Firma): void {
    this.firmaActiva.set(f);
    this.firmanteNombre = "";
    this.hayTrazo = false;
    // El canvas aparece con el @if, así que hay que esperar al render.
    setTimeout(() => this.limpiarPad(), 0);
  }

  cerrarPad(): void {
    this.firmaActiva.set(null);
  }

  private ctx(): CanvasRenderingContext2D | null {
    const c = this.canvasRef()?.nativeElement;
    return c ? c.getContext("2d") : null;
  }

  limpiarPad(): void {
    const c = this.canvasRef()?.nativeElement;
    const ctx = this.ctx();
    if (!c || !ctx) return;
    // El canvas tiene un tamaño interno propio (300×150 por defecto) que no
    // cambia porque CSS lo estire. Si no se iguala al tamaño en pantalla, el
    // trazo aparece desplazado o directamente fuera del área visible.
    const rect = c.getBoundingClientRect();
    if (rect.width) {
      c.width = Math.round(rect.width);
      c.height = Math.round(rect.height);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1F2933";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.hayTrazo = false;
  }

  /**
   * Convierte el punto de pantalla al sistema del canvas. Se escala en vez de
   * asumir 1:1: si el pad todavía no se había dimensionado, las dos medidas
   * no coinciden y el trazo se iría fuera.
   */
  private punto(e: PointerEvent): { x: number; y: number } {
    const c = this.canvasRef()!.nativeElement;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }

  padDown(e: PointerEvent): void {
    const c = this.canvasRef()?.nativeElement;
    // Primer trazo: si el pad aún conserva su tamaño por defecto se prepara
    // ahora, que es cuando ya está montado y medido con certeza.
    if (c && Math.abs(c.width - c.getBoundingClientRect().width) > 1) {
      this.limpiarPad();
    }
    const ctx = this.ctx();
    if (!ctx) return;
    this.dibujando = true;
    const p = this.punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    this.canvasRef()?.nativeElement.setPointerCapture(e.pointerId);
  }

  padMove(e: PointerEvent): void {
    if (!this.dibujando) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const p = this.punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    this.hayTrazo = true;
  }

  padUp(): void {
    this.dibujando = false;
  }

  guardarFirma(): void {
    const f = this.firmaActiva();
    const c = this.canvasRef()?.nativeElement;
    if (!f || !c) return;
    if (!this.hayTrazo) {
      this.toastr.warning("Falta el trazo de la firma");
      return;
    }
    this.guardando.set(true);
    this.srv
      .firmarPresencial(
        this.serviceOrderId,
        f.kind,
        c.toDataURL("image/png"),
        this.firmanteNombre,
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Firma registrada");
          this.cerrarPad();
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo guardar la firma");
        },
      });
  }

  pedirFirmaRemota(f: Firma): void {
    this.guardando.set(true);
    this.srv.solicitarFirmaRemota(this.serviceOrderId, f.kind).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastr.success("Enlace de firma enviado al cliente");
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo enviar el enlace");
      },
    });
  }

  enlaceFirma(f: Firma): string {
    return `${location.origin}/f/${f.token}`;
  }

  copiarEnlace(f: Firma): void {
    navigator.clipboard?.writeText(this.enlaceFirma(f));
    this.toastr.success("Enlace copiado");
  }

  // ─── Mensajes ───────────────────────────────────────────────

  responder(): void {
    const texto = this.nuevoMensaje.trim();
    if (!texto || this.guardando()) return;
    this.guardando.set(true);
    this.srv.responder(this.serviceOrderId, texto).subscribe({
      next: () => {
        this.guardando.set(false);
        this.nuevoMensaje = "";
        this.srv.mensajes(this.serviceOrderId).subscribe({
          next: (m) => this.mensajes.set(m),
        });
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastr.error(e?.error?.message || "No se pudo enviar");
      },
    });
  }

  money(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
}
