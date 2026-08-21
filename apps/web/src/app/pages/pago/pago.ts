import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { AuthService } from "../../auth/auth.service";
import {
  BillingStateService,
  EstadoCobro,
} from "../../shared/services/billing-state.service";
import { PagoService } from "./pago.service";

/**
 * Portal de pago del SaaS. Es a donde llega un cliente bloqueado por falta de
 * pago (lo manda el interceptor) y también donde uno en solo-lectura viene a
 * regularizarse desde el banner. Muestra el adeudo, deja pagar en línea y da
 * el contacto de Nexus como vía alterna.
 */
@Component({
  selector: "app-pago",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./pago.html",
  styleUrls: ["./pago.scss"],
})
export class Pago implements OnInit {
  private srv = inject(PagoService);
  private billing = inject(BillingStateService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  estado = signal<EstadoCobro | null>(null);
  cargando = signal(true);
  pagando = signal(false);

  alCorriente = computed(() => this.estado()?.estado === "AL_CORRIENTE");
  bloqueado = computed(() => this.estado()?.estado === "BLOQUEADO");

  ngOnInit(): void {
    this.srv.estado().subscribe({
      next: (e) => {
        this.estado.set(e);
        this.billing.estado.set(e);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  pagar(): void {
    this.pagando.set(true);
    this.srv.checkout().subscribe({
      next: (r) => {
        if (r?.url) {
          window.location.href = r.url;
        } else {
          this.pagando.set(false);
          this.toastr.error("No se pudo iniciar el pago");
        }
      },
      error: (e) => {
        this.pagando.set(false);
        this.toastr.error(
          e?.error?.message || "No se pudo iniciar el pago en línea",
        );
      },
    });
  }

  volver(): void {
    this.router.navigate(["/dashboard/default"]);
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(["/auth/login"]);
  }
}
