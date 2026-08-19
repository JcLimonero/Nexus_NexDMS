import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";
import { EvidenciaRecepcion } from "../../shared/components/evidencia-recepcion/evidencia-recepcion";

interface TrackingData {
  folio: string;
  status: string;
  statusLabel: string;
  cancelled: boolean;
  receivedAt: string;
  readyAt: string | null;
  deliveredAt: string | null;
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null;
  branch: { name: string; phone: string | null } | null;
  /** Quién recibió la unidad: a quién le pregunta el cliente. */
  advisor: { name: string; phone: string | null; email: string | null } | null;
  steps: { status: string; label: string; done: boolean; current: boolean }[];
  updates: { message: string; createdAt: string }[];
}

/** Página pública (sin login): seguimiento de orden de servicio. */
@Component({
  selector: "app-tracking-publico",
  standalone: true,
  imports: [CommonModule, EvidenciaRecepcion],
  templateUrl: "./tracking-publico.html",
  styleUrls: ["./public-pages.scss"],
})
export class TrackingPublico implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<TrackingData | null>(null);
  /** El mismo token de la liga, para pedir la evidencia de su unidad. */
  token = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get("token");
    this.token.set(token);
    this.http.get<TrackingData>(`/api/v1/public/tracking/${token}`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(
          "No encontramos esta orden. Verifica el link o contacta a la sucursal.",
        );
      },
    });
  }

  dateLabel(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  vehicleLabel(): string {
    const v = this.data()?.vehicle;
    if (!v) return "";
    const base = [v.brand, v.model].filter(Boolean).join(" ");
    return v.plate ? `${v.plate} · ${base}` : base;
  }
}
