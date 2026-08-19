import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { ModulesService } from "../../shared/services/modules.service";

/** Pantalla que ve el usuario al entrar a un módulo fuera de su licencia. */
@Component({
  selector: "app-sin-acceso",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid">
      <div class="card">
        <div class="card-body locked">
          <div class="lock">🔒</div>
          <h5>Módulo no incluido en tu plan</h5>
          <p class="muted">
            @if (moduleName()) {
              El módulo <strong>{{ moduleName() }}</strong> no está disponible
              con tu licencia actual ({{ modulesService.plan() || "—" }}).
            } @else {
              Este módulo no está disponible con tu licencia actual.
            }
          </p>
          <p class="muted small">
            Contacta a Nexus Q Tech para ampliar tu plan y activarlo.
          </p>
          <a class="btn btn-primary" routerLink="/dashboard/default">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .locked {
        text-align: center;
        padding: var(--space-32) var(--space-24);
      }
      .lock {
        font-size: 40px;
        margin-bottom: var(--space-12);
      }
      h5 {
        margin: 0 0 var(--space-8);
        font-size: var(--text-lg);
        color: var(--text-primary);
      }
      .muted {
        color: var(--text-secondary);
        margin: 0 0 var(--space-8);
      }
      .small {
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin-bottom: var(--space-24);
      }
    `,
  ],
})
export class SinAcceso {
  private route = inject(ActivatedRoute);
  modulesService = inject(ModulesService);

  moduleName = signal<string>("");

  constructor() {
    const key = this.route.snapshot.queryParamMap.get("modulo");
    if (key) {
      // Si no está licenciado no vendrá en /modules/me: se muestra la clave
      this.moduleName.set(this.modulesService.get(key)?.name ?? key);
    }
  }
}
