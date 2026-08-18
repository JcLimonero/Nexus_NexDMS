import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

type Decision = "ACCEPTED" | "REJECTED" | "CALLBACK";

interface Concepto {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  urgencia: "URGENTE" | "RECOMENDADO" | "OPCIONAL";
  notaTecnico: string | null;
  estado: string;
  fotos: string[];
}

interface CotizacionData {
  folio: string;
  status: string;
  respondida: boolean;
  firmada: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  conditions: string | null;
  sucursal: string | null;
  orden: { folio: string; trackingToken: string } | null;
  vehiculo: {
    marca: string | null;
    modelo: string | null;
    placa: string | null;
  } | null;
  conceptos: Concepto[];
}

/**
 * Página pública: el cliente autoriza el presupuesto del taller trabajo por
 * trabajo, con fotos de lo que se recomienda cambiar, y firma para dejar
 * constancia. Lo que no aprueba queda guardado para re-ofertarlo después.
 */
@Component({
  selector: "app-cotizacion-publica",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./cotizacion-publica.html",
  styleUrls: ["./public-pages.scss"],
})
export class CotizacionPublica implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  @ViewChild("firmaCanvas") canvasRef?: ElementRef<HTMLCanvasElement>;

  private token = "";
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<CotizacionData | null>(null);
  enviando = signal(false);
  resultado = signal<{ aceptadas: number; total: number } | null>(null);

  /** La decisión del cliente por cada línea (itemId → decisión). */
  decisiones = signal<Record<string, Decision>>({});

  readonly IVA = 0.16;
  readonly URG: Record<string, string> = {
    URGENTE: "Urgente",
    RECOMENDADO: "Recomendado",
    OPCIONAL: "Opcional",
  };

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") ?? "";
    this.http
      .get<CotizacionData>(`/api/v1/public/quotations/${this.token}`)
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(
            "No encontramos este presupuesto. Verifica el enlace o comunícate con la sucursal.",
          );
        },
      });
  }

  // ── Decisión por línea ──
  decidir(id: string, val: Decision): void {
    const d = { ...this.decisiones() };
    if (d[id] === val) delete d[id];
    else d[id] = val;
    this.decisiones.set(d);
  }
  esDecision(id: string, val: Decision): boolean {
    return this.decisiones()[id] === val;
  }

  aceptadas = computed(() => {
    const dec = this.decisiones();
    return (this.data()?.conceptos ?? []).filter(
      (c) => dec[c.id] === "ACCEPTED",
    );
  });
  totalAceptado = computed(
    () => this.aceptadas().reduce((s, c) => s + c.subtotal, 0) * (1 + this.IVA),
  );
  hayDecision = computed(() => Object.keys(this.decisiones()).length > 0);

  // ── Firma en canvas ──
  private dibujando = false;
  private canvasSized = false;
  firmado = signal(false);

  private ctx(): CanvasRenderingContext2D | null {
    return this.canvasRef?.nativeElement.getContext("2d") ?? null;
  }
  private sizeCanvas(): void {
    const c = this.canvasRef?.nativeElement;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width;
    c.height = r.height;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#16262f";
    }
    this.canvasSized = true;
  }
  private pos(ev: MouseEvent | TouchEvent): { x: number; y: number } {
    const c = this.canvasRef!.nativeElement;
    const r = c.getBoundingClientRect();
    const t = "touches" in ev ? ev.touches[0] : ev;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  iniciarFirma(ev: MouseEvent | TouchEvent): void {
    if (!this.canvasSized) this.sizeCanvas();
    const ctx = this.ctx();
    if (!ctx) return;
    this.dibujando = true;
    const p = this.pos(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ev.preventDefault();
  }
  moverFirma(ev: MouseEvent | TouchEvent): void {
    if (!this.dibujando) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const p = this.pos(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!this.firmado()) this.firmado.set(true);
    ev.preventDefault();
  }
  finFirma(): void {
    this.dibujando = false;
  }
  limpiarFirma(): void {
    const c = this.canvasRef?.nativeElement;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    this.firmado.set(false);
  }

  // ── Envío ──
  enviar(): void {
    if (this.enviando()) return;
    const dec = this.decisiones();
    const lineas = Object.entries(dec).map(([itemId, decision]) => ({
      itemId,
      decision,
    }));
    if (!lineas.length) {
      this.error.set("Marca al menos un trabajo para continuar.");
      return;
    }
    this.error.set(null);
    const firma =
      this.firmado() && this.canvasRef
        ? this.canvasRef.nativeElement.toDataURL("image/png")
        : undefined;
    this.enviando.set(true);
    this.http
      .post<{ aceptadas: number }>(
        `/api/v1/public/quotations/${this.token}/lineas`,
        { lineas, firma },
      )
      .subscribe({
        next: (r) => {
          this.enviando.set(false);
          this.resultado.set({
            aceptadas: r.aceptadas,
            total: this.totalAceptado(),
          });
        },
        error: (err) => {
          this.enviando.set(false);
          this.error.set(
            err?.error?.message || "No pudimos registrar tu respuesta.",
          );
        },
      });
  }

  vehiculoLabel(): string {
    const v = this.data()?.vehiculo;
    if (!v) return "";
    const base = [v.marca, v.modelo].filter(Boolean).join(" ");
    return v.placa ? `${v.placa} · ${base}` : base;
  }

  money(n: number): string {
    return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
}
