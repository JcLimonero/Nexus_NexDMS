import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../../auth/auth.service";

/**
 * Punto de entrada por handoff: el portal de superadmin abre esta ruta con los
 * tokens en el fragmento (#at=…&rt=…). Se guardan, se resuelve la sesión y se
 * entra al DMS. El fragmento se borra del historial de inmediato.
 */
@Component({
  selector: "app-sso",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sso-cargando">
      @if (error()) {
        <p>No se pudo abrir la sesión. Redirigiendo al acceso…</p>
      } @else {
        <div class="spinner-border"></div>
        <p>Entrando…</p>
      }
    </div>
  `,
  styles: [
    `.sso-cargando {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--bs-secondary-color, #6b7280);
    }`,
  ],
})
export class Sso implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  error = signal(false);

  ngOnInit(): void {
    const frag = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(frag);
    const at = params.get("at");
    const rt = params.get("rt") ?? "";

    // Se quita el fragmento del historial para no dejar los tokens a la vista.
    history.replaceState(null, "", window.location.pathname);

    if (!at) {
      this.router.navigate(["/auth/login"]);
      return;
    }

    this.auth.entrarConToken(at, rt).subscribe((ok) => {
      if (ok) {
        this.router.navigate(["/dashboard/default"]);
      } else {
        this.error.set(true);
        setTimeout(() => this.router.navigate(["/auth/login"]), 1500);
      }
    });
  }
}
