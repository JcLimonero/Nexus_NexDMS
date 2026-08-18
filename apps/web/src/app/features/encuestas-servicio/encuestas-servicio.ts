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
                        <div
                          class="progress-bar"
                          [style.width.%]="(p.promedio / 5) * 100"
                          [style.background]="color(p.promedio)"
                        ></div>
                      </div>
                    </div>
                  }
                }
              }
            </div>
          </div>
        </div>
      </div>
      <p class="text-muted small">
        Las preguntas se configuran en Configuración › Encuestas (Taller).
      </p>
    </div>
  `,
})
export class EncuestasServicio implements OnInit {
  private http = inject(HttpClient);
  data = signal<ResumenEncuestas | null>(null);

  ngOnInit(): void {
    this.http
      .get<ResumenEncuestas>("/api/v1/service-orders/surveys/resumen")
      .subscribe({ next: (d) => this.data.set(d) });
  }

  color(p: number): string {
    if (p >= 4) return "#16a34a";
    if (p >= 3) return "#f59e0b";
    return "#dc2626";
  }
}
