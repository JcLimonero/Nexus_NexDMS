import { Component, HostListener, inject } from "@angular/core";
import { ConfirmService } from "../../services/confirm.service";

/** Diálogo de confirmación; se monta una vez en la raíz. */
@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  template: `
    @if (svc.estado(); as e) {
      <div class="fondo sobre" (click)="svc.responder(false)"></div>
      <div class="dialogo sobre confirm" role="alertdialog" aria-modal="true">
        <h2>{{ e.titulo }}</h2>
        @if (e.mensaje) {
          <p class="confirm-msg">{{ e.mensaje }}</p>
        }
        <div class="dialogo-pie">
          <button type="button" class="btn-secundario" (click)="svc.responder(false)">
            {{ e.cancelar || "Cancelar" }}
          </button>
          <button
            type="button"
            [class.btn-principal]="!e.peligro"
            [class.btn-peligro]="e.peligro"
            (click)="svc.responder(true)"
          >
            {{ e.confirmar || "Confirmar" }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm {
        max-width: min(440px, calc(100vw - 32px));
      }
      .confirm-msg {
        color: var(--text-secondary, #5a6b78);
        margin: 8px 0 4px;
      }
      .btn-peligro {
        border: none;
        border-radius: var(--radius-md, 8px);
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        background: var(--danger, #b3261e);
        color: #fff;
      }
    `,
  ],
})
export class ConfirmDialog {
  svc = inject(ConfirmService);

  @HostListener("document:keydown.escape")
  onEsc(): void {
    if (this.svc.estado()) this.svc.responder(false);
  }
}
