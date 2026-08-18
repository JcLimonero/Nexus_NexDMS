import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import { ConfiguracionService } from "../configuracion.service";

/**
 * Reglas de "salir con adeudo" (R6) a nivel tenant: hasta cuántos días puede
 * quedar la fecha promesa de pago y si se revisa el límite de crédito del
 * cliente al entregar. El límite por cliente se captura en su ficha.
 */
@Component({
  selector: "nex-credito-config",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Crédito y entregas con adeudo</h5>
              <p class="text-muted small mb-0">
                Controla en qué condiciones una orden puede entregarse sin
                cobrarse por completo.
              </p>
            </div>
            <div class="card-body">
              @if (cargando()) {
                <p class="text-muted">Cargando…</p>
              } @else {
                <div class="mb-3">
                  <label class="form-label">
                    Tope de días de la fecha promesa de pago
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="promiseDaysCap"
                    min="0"
                    step="1"
                    placeholder="0 = sin tope"
                    style="max-width: 220px"
                  />
                  <div class="form-text">
                    Al entregar con adeudo, la fecha promesa no podrá exceder
                    estos días. 0 o vacío = sin tope.
                  </div>
                </div>

                <div class="form-check form-switch mb-4">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="creditCheck"
                    [(ngModel)]="creditCheckEnabled"
                  />
                  <label class="form-check-label" for="creditCheck">
                    Revisar el límite de crédito del cliente al entregar
                  </label>
                  <div class="form-text">
                    Si se activa, no se podrá entregar con adeudo cuando el
                    adeudo vigente más esta orden superen el límite de crédito
                    capturado en la ficha del cliente.
                  </div>
                </div>

                <button
                  class="btn btn-primary"
                  [disabled]="guardando()"
                  (click)="guardar()"
                >
                  {{ guardando() ? "Guardando…" : "Guardar cambios" }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CreditoConfig implements OnInit {
  private srv = inject(ConfiguracionService);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);

  promiseDaysCap: number | null = null;
  creditCheckEnabled = false;

  ngOnInit(): void {
    this.srv.getCreditConfig().subscribe({
      next: ({ creditConfig }) => {
        this.promiseDaysCap = creditConfig?.promiseDaysCap ?? null;
        this.creditCheckEnabled = creditConfig?.creditCheckEnabled ?? false;
        this.cargando.set(false);
      },
      error: () => {
        this.toastr.error("No se pudo cargar la configuración");
        this.cargando.set(false);
      },
    });
  }

  guardar(): void {
    this.guardando.set(true);
    const cap = Number(this.promiseDaysCap);
    this.srv
      .setCreditConfig({
        promiseDaysCap: cap > 0 ? cap : 0,
        creditCheckEnabled: this.creditCheckEnabled,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastr.success("Configuración guardada");
        },
        error: (e) => {
          this.guardando.set(false);
          this.toastr.error(e?.error?.message || "No se pudo guardar");
        },
      });
  }
}
