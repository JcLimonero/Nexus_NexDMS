import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

interface CotizacionData {
  folio: string;
  status: string;
  respondida: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  conditions: string | null;
  sucursal: string | null;
  orden: { folio: string; trackingToken: string } | null;
  vehiculo: { marca: string | null; modelo: string | null; placa: string | null } | null;
  conceptos: {
    descripcion: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
}

/** Página pública: el cliente autoriza o rechaza la cotización del taller. */
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

  private token = "";
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<CotizacionData | null>(null);
  enviando = signal(false);
  resultado = signal<"aceptada" | "rechazada" | null>(null);
  nota = "";

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
            "No encontramos esta cotización. Verifica el enlace o comunícate con la sucursal.",
          );
        },
      });
  }

  responder(acepta: boolean): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.http
      .post(`/api/v1/public/quotations/${this.token}`, {
        acepta,
        nota: this.nota.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.resultado.set(acepta ? "aceptada" : "rechazada");
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
