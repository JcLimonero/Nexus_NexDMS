import { Component, OnInit, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/**
 * Entrada del dominio raíz. Con sesión, manda al panel; sin sesión, muestra la
 * landing pública (`/inicio.html`, servida como estático desde `public/`), en
 * vez de caer directo al login. Desde la landing, el botón "Acceder" lleva a
 * `/acceso`.
 */
@Component({
  selector: "app-inicio",
  standalone: true,
  template: "",
})
export class Inicio implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    if (this.auth.autenticado()) {
      void this.router.navigate(["/dashboard"]);
    } else {
      // Página estática fuera del router de Angular: navegación de documento.
      window.location.replace("/inicio.html");
    }
  }
}
