import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import {
  ConfiguracionService,
  SurveyArea,
  SurveyConfig,
  SurveyQuestion,
} from "../configuracion.service";

/** Configuración de las preguntas de encuesta por área (servicio / venta). */
@Component({
  selector: "nex-encuestas-config",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 class="mb-0">Encuestas de satisfacción</h5>
            <small class="text-muted">Define las preguntas por área.</small>
          </div>
          <div class="btn-group">
            <button
              class="btn btn-sm"
              [class.btn-primary]="area === 'SERVICE'"
              [class.btn-outline-primary]="area !== 'SERVICE'"
              (click)="cambiarArea('SERVICE')"
            >
              Taller (servicio)
            </button>
            <button
              class="btn btn-sm"
              [class.btn-primary]="area === 'SALES'"
              [class.btn-outline-primary]="area !== 'SALES'"
              (click)="cambiarArea('SALES')"
            >
              Ventas de unidades
            </button>
          </div>
        </div>
        <div class="card-body">
          @if (cargando()) {
            <div class="spinner-border" role="status"></div>
          } @else {
            <div class="mb-3">
              <label class="form-label">Mensaje de introducción</label>
              <input class="form-control" [(ngModel)]="intro" />
            </div>
            <div class="mb-3">
              <label class="form-label">Mensaje de agradecimiento</label>
              <input class="form-control" [(ngModel)]="thanks" />
            </div>

            <h6>Preguntas</h6>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th style="width: 40px">#</th>
                    <th>Pregunta</th>
                    <th style="width: 160px">Tipo</th>
                    <th style="width: 70px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (q of preguntas(); track $index) {
                    <tr>
                      <td>{{ $index + 1 }}</td>
                      <td><input class="form-control form-control-sm" [(ngModel)]="q.label" /></td>
                      <td>
                        <select class="form-select form-select-sm" [(ngModel)]="q.type">
                          <option value="RATING">Puntaje (1-5)</option>
                          <option value="TEXT">Texto abierto</option>
                        </select>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-outline-danger" (click)="quitar($index)">×</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <button class="btn btn-sm btn-outline-secondary" (click)="agregar()">+ Agregar pregunta</button>

            <hr />
            <button class="btn btn-primary" [disabled]="guardando()" (click)="guardar()">
              @if (guardando()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              Guardar encuesta de {{ area === 'SERVICE' ? 'taller' : 'ventas' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class EncuestasConfig implements OnInit {
  private srv = inject(ConfiguracionService);
  private toastr = inject(ToastrService);

  area: SurveyArea = "SERVICE";
  cargando = signal(true);
  guardando = signal(false);
  intro = "";
  thanks = "";
  preguntas = signal<SurveyQuestion[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cambiarArea(a: SurveyArea): void {
    this.area = a;
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.getSurveyConfig(this.area).subscribe({
      next: (c: SurveyConfig) => {
        this.intro = c.intro ?? "";
        this.thanks = c.thanks ?? "";
        this.preguntas.set(c.questions.map((q) => ({ ...q })));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  agregar(): void {
    this.preguntas.update((qs) => [
      ...qs,
      { id: "q" + (qs.length + 1) + "_" + Date.now(), label: "", type: "RATING" },
    ]);
  }

  quitar(i: number): void {
    this.preguntas.update((qs) => qs.filter((_, idx) => idx !== i));
  }

  guardar(): void {
    const qs = this.preguntas().filter((q) => q.label.trim());
    if (!qs.length) {
      this.toastr.warning("Agrega al menos una pregunta");
      return;
    }
    this.guardando.set(true);
    this.srv
      .setSurveyConfig(this.area, {
        intro: this.intro || null,
        thanks: this.thanks || null,
        questions: qs,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Encuesta guardada");
        },
        error: (err) => {
          this.guardando.set(false);
          this.toastr.error(err?.error?.message || "No se pudo guardar");
        },
      });
  }
}
