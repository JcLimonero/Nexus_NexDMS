import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";

interface PreguntaResumen {
  id: string;
  label: string;
  promedio: number;
  respuestas: number;
}
interface ResumenEncuestas {
  total: number;
  respondidas: number;
  promedioGeneral: number | null;
  preguntas: PreguntaResumen[];
}
interface EncuestaFila {
  id: string;
  folio: string;
  clientName: string | null;
  vehicle: string | null;
  plate: string | null;
  score: number | null;
  answeredAt: string;
}
interface FichaRespuesta {
  label: string;
  type: "RATING" | "TEXT";
  value: number | string | null;
}
interface Ficha {
  folio: string;
  deliveredAt: string | null;
  total: number;
  cliente: { nombre: string | null; telefono: string | null };
  vehiculo: string | null;
  placa: string | null;
  trabajos: string[];
  refacciones: string[];
  score: number | null;
  comment: string | null;
  respondidaEn: string | null;
  respuestas: FichaRespuesta[];
}

@Component({
  selector: "app-encuestas-servicio",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid">
      <div class="row mb-3">
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-header"><h6 class="mb-0">Satisfacción de servicio</h6></div>
            <div class="card-body text-center">
              @if (data(); as d) {
                <div class="display-4 mb-0">
                  {{ d.promedioGeneral !== null ? d.promedioGeneral : "—" }}
                  <small class="text-muted" style="font-size: 1.1rem">/ 5</small>
                </div>
                <p class="text-muted mb-0">{{ d.respondidas }} de {{ d.total }} respondidas</p>
              } @else {
                <div class="spinner-border" role="status"></div>
              }
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div class="card h-100">
            <div class="card-header"><h6 class="mb-0">Promedio por pregunta</h6></div>
            <div class="card-body">
              @if (data(); as d) {
                @if (!d.preguntas.length) {
                  <p class="text-muted mb-0">Aún no hay respuestas de puntaje.</p>
                } @else {
                  @for (p of d.preguntas; track p.id) {
                    <div class="mb-3">
                      <div class="d-flex justify-content-between">
                        <span>{{ p.label }}</span>
                        <strong>{{ p.promedio }} / 5 <small class="text-muted">({{ p.respuestas }})</small></strong>
                      </div>
                      <div class="progress" style="height: 10px">
                        <div class="progress-bar" [style.width.%]="(p.promedio / 5) * 100" [style.background]="color(p.promedio)"></div>
                      </div>
                    </div>
                  }
                }
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de encuestas respondidas -->
      <div class="card">
        <div class="card-header"><h6 class="mb-0">Encuestas respondidas</h6></div>
        <div class="card-body">
          @if (lista().length === 0) {
            <p class="text-muted mb-0">Aún no hay encuestas respondidas.</p>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead>
                  <tr><th>Orden</th><th>Cliente</th><th>Vehículo</th><th>Puntaje</th><th>Respondida</th><th></th></tr>
                </thead>
                <tbody>
                  @for (e of lista(); track e.id) {
                    <tr>
                      <td><strong>{{ e.folio }}</strong></td>
                      <td>{{ e.clientName || "—" }}</td>
                      <td>{{ e.vehicle || "—" }} <span class="text-muted">{{ e.plate || "" }}</span></td>
                      <td>{{ e.score !== null ? e.score + " / 5" : "—" }}</td>
                      <td>{{ e.answeredAt | date: "dd/MM/yy HH:mm" }}</td>
                      <td><button class="btn btn-sm btn-outline-primary" (click)="verFicha(e.id)">Ver ficha</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <p class="text-muted small mt-2">
        Las preguntas se configuran en Configuración › Encuestas (Taller).
      </p>
    </div>

    <!-- Ficha -->
    @if (ficha(); as f) {
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1050;" (click)="cerrarFicha()"></div>
      <div class="card shadow" role="dialog"
        style="position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 1051; width: min(560px, 94vw); max-height: 90vh; overflow: auto;">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Encuesta · {{ f.folio }}</h5>
          <button type="button" class="btn-close" (click)="cerrarFicha()"></button>
        </div>
        <div class="card-body">
          <div class="row mb-2">
            <div class="col-6">
              <div class="text-muted small">Cliente</div>
              <div>{{ f.cliente.nombre || "—" }}</div>
              @if (f.cliente.telefono) { <div class="text-muted small">{{ f.cliente.telefono }}</div> }
            </div>
            <div class="col-6">
              <div class="text-muted small">Vehículo</div>
              <div>{{ f.vehiculo || "—" }} <span class="text-muted">{{ f.placa || "" }}</span></div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-6">
              <div class="text-muted small">Entregada</div>
              <div>{{ f.deliveredAt ? (f.deliveredAt | date: "dd/MM/yy") : "—" }}</div>
            </div>
            <div class="col-6">
              <div class="text-muted small">Total del servicio</div>
              <div>{{ f.total | currency: "MXN" : "symbol-narrow" }}</div>
            </div>
          </div>

          @if (f.trabajos.length) {
            <div class="mb-3">
              <div class="text-muted small mb-1">Servicio realizado</div>
              <ul class="mb-0">
                @for (t of f.trabajos; track t) { <li>{{ t }}</li> }
              </ul>
            </div>
          }
          @if (f.refacciones.length) {
            <div class="mb-3">
              <div class="text-muted small mb-1">Refacciones</div>
              <div>{{ f.refacciones.join(", ") }}</div>
            </div>
          }

          <hr />
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Respuestas</h6>
            <span class="badge bg-primary">{{ f.score !== null ? f.score + " / 5" : "—" }}</span>
          </div>
          <table class="table table-sm">
            <tbody>
              @for (r of f.respuestas; track r.label) {
                <tr>
                  <td>{{ r.label }}</td>
                  <td class="text-end">
                    @if (r.type === "RATING") {
                      <strong>{{ r.value !== null ? r.value + " / 5" : "—" }}</strong>
                    } @else {
                      {{ r.value || "—" }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class EncuestasServicio implements OnInit {
  private http = inject(HttpClient);
  data = signal<ResumenEncuestas | null>(null);
  lista = signal<EncuestaFila[]>([]);
  ficha = signal<Ficha | null>(null);

  private base = "/api/v1/service-orders/surveys";

  ngOnInit(): void {
    this.http
      .get<ResumenEncuestas>(`${this.base}/resumen`)
      .subscribe({ next: (d) => this.data.set(d) });
    this.http
      .get<EncuestaFila[]>(`${this.base}/list`)
      .subscribe({ next: (d) => this.lista.set(d) });
  }

  verFicha(id: string): void {
    this.http
      .get<Ficha>(`${this.base}/${id}/ficha`)
      .subscribe({ next: (f) => this.ficha.set(f) });
  }

  cerrarFicha(): void {
    this.ficha.set(null);
  }

  color(p: number): string {
    if (p >= 4) return "#16a34a";
    if (p >= 3) return "#f59e0b";
    return "#dc2626";
  }
}
