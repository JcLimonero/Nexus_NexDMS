import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

import { RecepcionPage } from "../../features/taller/recepcion/recepcion-page";
import { AuthService } from "../../auth/auth.service";

/**
 * Portal de recepción.
 *
 * La misma recepción que en el back office, pero sin el resto del DMS
 * alrededor: quien recibe unidades está de pie con un iPad y una sola tarea,
 * y el menú de dieciséis módulos solo le estorba.
 *
 * Envuelve la pantalla existente en vez de duplicarla. Si el flujo de
 * recepción cambia, cambia en un solo sitio.
 */
@Component({
  selector: "app-portal-recepcion",
  standalone: true,
  imports: [CommonModule, RecepcionPage],
  templateUrl: "./portal-recepcion.html",
  styleUrls: ["./portal-recepcion.scss"],
})
export class PortalRecepcion {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = signal<string>("");

  constructor() {
    const u = this.auth.getUser();
    this.usuario.set(
      u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Recepción" : "Recepción",
    );
  }

  /** Vuelve al DMS completo, para quien tiene acceso a ambos. */
  irAlSistema(): void {
    this.router.navigate(["/dashboard"]);
  }

  salir(): void {
    this.auth.logout();
  }
}
