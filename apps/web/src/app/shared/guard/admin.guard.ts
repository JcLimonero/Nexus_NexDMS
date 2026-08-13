import { Injectable, inject } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";

import { AuthService } from "../../auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class AdminGuard {
  private router = inject(Router);
  private auth = inject(AuthService);

  canActivate(
    _ruta: ActivatedRouteSnapshot,
    estado: RouterStateSnapshot,
  ): boolean {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    // Se recuerda a dónde iba para volver ahí tras entrar. Sin esto, quien
    // abre un enlace directo —el portal de recepción desde el iPad, por
    // ejemplo— acaba en el tablero y tiene que buscarlo otra vez.
    this.router.navigate(["/auth/login"], {
      queryParams: { returnUrl: estado.url },
    });
    return false;
  }
}
