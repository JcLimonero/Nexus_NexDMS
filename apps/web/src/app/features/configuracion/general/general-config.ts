import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ToastrService } from "ngx-toastr";

import { ConfiguracionService } from "../configuracion.service";
import { BrandingService } from "../../../shared/services/branding.service";

/** Configuración general del tenant (por ahora: divisa). */
@Component({
  selector: "nex-general-config",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">Configuración general</h5>
              <small class="text-muted">Parámetros del grupo.</small>
            </div>
            <div class="card-body">
              @if (cargando()) {
                <div class="spinner-border" role="status"></div>
              } @else {
                <div class="mb-3">
                  <label class="form-label">Divisa</label>
                  <select class="form-select" [(ngModel)]="currency" style="max-width: 260px">
                    @for (d of divisas; track d.code) {
                      <option [value]="d.code">{{ d.code }} — {{ d.label }}</option>
                    }
                  </select>
                  <div class="form-text">
                    Se usa para mostrar los montos en todo el sistema.
                    Ejemplo: {{ ejemplo() }}
                  </div>
                </div>
                <button class="btn btn-primary" [disabled]="guardando()" (click)="guardar()">
                  @if (guardando()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                  Guardar
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GeneralConfig implements OnInit {
  private srv = inject(ConfiguracionService);
  private branding = inject(BrandingService);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  guardando = signal(false);
  currency = "MXN";

  readonly divisas = [
    { code: "MXN", label: "Peso mexicano" },
    { code: "USD", label: "Dólar estadounidense" },
    { code: "EUR", label: "Euro" },
    { code: "GTQ", label: "Quetzal" },
    { code: "COP", label: "Peso colombiano" },
  ];

  ngOnInit(): void {
    this.srv.getCurrency().subscribe({
      next: (r) => {
        this.currency = r.currency || "MXN";
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  ejemplo(): string {
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: this.currency,
      }).format(1234.5);
    } catch {
      return `${this.currency} 1,234.50`;
    }
  }

  guardar(): void {
    this.guardando.set(true);
    this.srv.setCurrency(this.currency).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.branding.fijarDivisa(r.currency);
        this.toastr.success("Divisa actualizada");
      },
      error: (err) => {
        this.guardando.set(false);
        this.toastr.error(err?.error?.message || "No se pudo guardar");
      },
    });
  }
}
