import { Component, inject } from "@angular/core";
import { NotificacionService } from "../../services/notificacion.service";

/** Host de toasts; se monta una vez en la raíz de la app. */
@Component({
  selector: "app-toasts",
  standalone: true,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of noti.toasts(); track t.id) {
        <div class="toast" [attr.data-tono]="t.tono" (click)="noti.cerrar(t.id)">
          {{ t.texto }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 200;
        max-width: min(360px, calc(100vw - 32px));
      }
      .toast {
        padding: 12px 14px;
        border-radius: var(--radius-md, 8px);
        font-size: 14px;
        color: #fff;
        background: var(--text-primary, #16262f);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
        cursor: pointer;
      }
      .toast[data-tono="ok"] {
        background: var(--success, #157f52);
      }
      .toast[data-tono="error"] {
        background: var(--danger, #b3261e);
      }
      .toast[data-tono="info"] {
        background: var(--primary, #105078);
      }
    `,
  ],
})
export class Toasts {
  noti = inject(NotificacionService);
}
