import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BillingStateService } from "../../services/billing-state.service";

/**
 * Aviso permanente cuando la cuenta está en solo-lectura por un adeudo del
 * SaaS: el cliente puede consultar pero no capturar, y aquí se le dice cuántos
 * días le quedan antes del bloqueo total y por dónde regularizarse.
 *
 * El bloqueo total no usa este banner: ahí el interceptor manda directo al
 * portal de pago.
 */
@Component({
  selector: "app-billing-banner",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (billing.enSoloLectura(); as _) {
      @if (billing.estado(); as e) {
        <div class="billing-banner" role="alert">
          <span class="billing-banner__icon">⚠️</span>
          <span class="billing-banner__text">
            Tu cuenta tiene un adeudo vencido de
            <strong>{{ e.adeudo | currency: "MXN" : "symbol-narrow" }}</strong
            >. Estás en <strong>solo lectura</strong>: por ahora no puedes
            capturar información.
            @if (e.diasParaBloqueo > 0) {
              Te
              {{ e.diasParaBloqueo === 1 ? "queda" : "quedan" }}
              <strong>{{ e.diasParaBloqueo }}</strong>
              {{ e.diasParaBloqueo === 1 ? "día" : "días" }} antes del bloqueo
              total.
            } @else {
              Hoy es el último día antes del bloqueo total.
            }
          </span>
          <a class="billing-banner__cta" routerLink="/pago">Pagar ahora</a>
        </div>
      }
    }
  `,
  styles: [
    `
      .billing-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin: 12px 16px 0;
        padding: 12px 16px;
        border: 1px solid #f0c36d;
        background: #fff6e0;
        color: #7a5900;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.4;
      }
      .billing-banner__icon {
        font-size: 18px;
      }
      .billing-banner__text {
        flex: 1 1 260px;
      }
      .billing-banner__cta {
        flex: 0 0 auto;
        padding: 7px 16px;
        background: #b8860b;
        color: #fff;
        border-radius: 6px;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }
      .billing-banner__cta:hover {
        background: #96700a;
        color: #fff;
      }
    `,
  ],
})
export class BillingBanner {
  billing = inject(BillingStateService);
}
