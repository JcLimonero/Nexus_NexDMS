import { Component, inject, isDevMode, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/**
 * Acceso al portal de administración del SaaS.
 *
 * Muestra la cuenta de demostración, pero solo en compilaciones de desarrollo:
 * este portal da de alta y suspende clientes, así que publicar la credencial
 * en un despliegue real sería entregar el control del SaaS. `ng build` de
 * producción evalúa `isDevMode()` como falso y elimina el bloque.
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

  readonly modoDemo = isDevMode();
  readonly cuentaDemo = {
    nombre: "Superadministrador",
    email: "admin@nexusqtech.com",
    password: "00@Limonero",
  };

  /** Llena el formulario y entra, para no teclearlo en cada demostración. */
  usarDemo(): void {
    this.email = this.cuentaDemo.email;
    this.password = this.cuentaDemo.password;
    this.entrar();
  }

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
