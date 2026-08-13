import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/**
 * Acceso al portal de administración del SaaS.
 *
 * A diferencia del DMS, aquí no se publican credenciales de demostración:
 * este portal da de alta y suspende clientes, así que quien entra debería
 * saber ya con qué cuenta hacerlo.
 */
@Component({
  selector: "app-acceso",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./acceso.html",
  styleUrls: ["./acceso.scss"],
})
export class Acceso {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = "";
  password = "";
  entrando = signal(false);
  error = signal<string | null>(null);

  entrar(): void {
    if (!this.email.trim() || !this.password) {
      this.error.set("Escribe tu correo y contraseña");
      return;
    }
    this.entrando.set(true);
    this.error.set(null);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.entrando.set(false);
        if (!this.auth.esSuperadmin()) {
          // La cuenta es válida pero no manda aquí: se corta la sesión en vez
          // de dejarla abierta contra un portal que no le corresponde.
          this.auth.salir();
          this.error.set("Esta cuenta no administra el SaaS");
          return;
        }
        void this.router.navigate(["/tenants"]);
      },
      error: (e) => {
        this.entrando.set(false);
        this.error.set(e?.error?.message || "No se pudo entrar");
      },
    });
  }
}
