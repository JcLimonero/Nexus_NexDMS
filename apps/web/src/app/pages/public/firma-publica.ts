import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

interface DocumentoFirma {
  kind: string;
  label: string;
  folio: string | null;
  sucursal: string | null;
  reportedFault: string | null;
  vehiculo: { marca: string | null; modelo: string | null; placa: string | null } | null;
}

/**
 * Firma remota: el cliente que dejó su unidad y se fue firma desde su
 * teléfono, con el enlace que le llegó por WhatsApp.
 *
 * No hay sesión: la credencial es el token del enlace, que se quema al
 * usarse. Por eso la página se limita a mostrar lo mínimo de la orden y a
 * recoger el trazo.
 */
@Component({
  selector: "app-firma-publica",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./firma-publica.html",
  styleUrls: ["./public-pages.scss"],
})
export class FirmaPublica implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  token = "";
  cargando = signal(true);
  error = signal<string | null>(null);
  doc = signal<DocumentoFirma | null>(null);
  firmado = signal(false);
  enviando = signal(false);
  nombre = "";

  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>("pad");
  private dibujando = false;
  private hayTrazo = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") ?? "";
    this.http
      .get<DocumentoFirma>(`/api/v1/public/signatures/${this.token}`)
      .subscribe({
        next: (d) => {
          this.doc.set(d);
          this.cargando.set(false);
          setTimeout(() => this.limpiar(), 0);
        },
        error: (e) => {
          this.cargando.set(false);
          this.error.set(
            e?.error?.message || "Este enlace de firma ya no es válido",
          );
        },
      });
  }

  private ctx(): CanvasRenderingContext2D | null {
    const c = this.canvasRef()?.nativeElement;
    return c ? c.getContext("2d") : null;
  }

  limpiar(): void {
    const c = this.canvasRef()?.nativeElement;
    const ctx = this.ctx();
    if (!c || !ctx) return;
    // El canvas se dimensiona al tamaño real en pantalla, si no el trazo
    // aparece desplazado respecto al dedo.
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

  /** Escala pantalla → canvas; los dos tamaños no tienen por qué coincidir. */
  private punto(e: PointerEvent): { x: number; y: number } {
    const c = this.canvasRef()!.nativeElement;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  }

  down(e: PointerEvent): void {
    const c = this.canvasRef()?.nativeElement;
    // Si el pad todavía tenía su tamaño por defecto, se prepara ahora.
    if (c && Math.abs(c.width - c.getBoundingClientRect().width) > 1) {
      this.limpiar();
    }
    const ctx = this.ctx();
    if (!ctx) return;
    this.dibujando = true;
    const p = this.punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    this.canvasRef()?.nativeElement.setPointerCapture(e.pointerId);
  }

  move(e: PointerEvent): void {
    if (!this.dibujando) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const p = this.punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    this.hayTrazo = true;
  }

  up(): void {
    this.dibujando = false;
  }

  firmar(): void {
    const c = this.canvasRef()?.nativeElement;
    if (!c || this.enviando()) return;
    if (!this.hayTrazo) {
      this.error.set("Traza tu firma en el recuadro antes de continuar");
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.http
      .post(`/api/v1/public/signatures/${this.token}`, {
        dataUrl: c.toDataURL("image/png"),
        signerName: this.nombre.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.firmado.set(true);
        },
        error: (e) => {
          this.enviando.set(false);
          this.error.set(e?.error?.message || "No se pudo registrar la firma");
        },
      });
  }

  vehiculoTexto(): string {
    const v = this.doc()?.vehiculo;
    if (!v) return "";
    return [v.marca, v.modelo, v.placa ? `· ${v.placa}` : null]
      .filter(Boolean)
      .join(" ");
  }
}
