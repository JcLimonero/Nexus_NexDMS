import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Barra } from "../../shared/barra/barra";
import { AdminUsuario, NuevoAdminUsuario, UsuariosService } from "./usuarios.service";

/**
 * Usuarios del portal de administración del SaaS (tabla admin_users, aparte de
 * los usuarios de los clientes). Aquí se dan de alta, se activan/desactivan,
 * se les cambia la contraseña o se eliminan.
 */
@Component({
  selector: "app-usuarios",
  standalone: true,
  imports: [CommonModule, FormsModule, Barra],
  templateUrl: "./usuarios.html",
  styles: [
    `
      .form-fila {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .form-fila input {
        flex: 1 1 160px;
        min-width: 140px;
        padding: 8px 10px;
        border: 1px solid var(--border, #d9dee3);
        border-radius: 8px;
        font: inherit;
      }
      .acciones {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    `,
  ],
})
export class Usuarios implements OnInit {
  private srv = inject(UsuariosService);

  usuarios = signal<AdminUsuario[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  // Alta
  nuevo = signal<NuevoAdminUsuario>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  // Cambio de contraseña inline
  passDe = signal<string | null>(null);
  passNueva = signal<string>("");

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (u) => {
        this.usuarios.set(u);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(this.msg(e));
      },
    });
  }

  setNuevo(campo: keyof NuevoAdminUsuario, v: string): void {
    this.nuevo.update((n) => ({ ...n, [campo]: v }));
  }

  crear(): void {
    const n = this.nuevo();
    if (!n.email.trim() || !n.firstName.trim() || !n.lastName.trim()) {
      this.aviso("Completa correo, nombre y apellido", true);
      return;
    }
    if (n.password.length < 8) {
      this.aviso("La contraseña debe tener al menos 8 caracteres", true);
      return;
    }
    this.guardando.set(true);
    this.srv.crear(n).subscribe({
      next: () => {
        this.guardando.set(false);
        this.nuevo.set({ email: "", firstName: "", lastName: "", password: "" });
        this.aviso("Usuario creado");
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.aviso(this.msg(e), true);
      },
    });
  }

  alternarActivo(u: AdminUsuario): void {
    this.srv.actualizar(u.id, { isActive: !u.isActive }).subscribe({
      next: () => {
        this.aviso(u.isActive ? "Usuario desactivado" : "Usuario activado");
        this.cargar();
      },
      error: (e) => this.aviso(this.msg(e), true),
    });
  }

  abrirPassword(u: AdminUsuario): void {
    this.passDe.set(u.id);
    this.passNueva.set("");
  }

  guardarPassword(): void {
    const id = this.passDe();
    if (!id) return;
    if (this.passNueva().length < 8) {
      this.aviso("La contraseña debe tener al menos 8 caracteres", true);
      return;
    }
    this.srv.cambiarPassword(id, this.passNueva()).subscribe({
      next: () => {
        this.passDe.set(null);
        this.aviso("Contraseña actualizada");
      },
      error: (e) => this.aviso(this.msg(e), true),
    });
  }

  eliminar(u: AdminUsuario): void {
    if (!confirm(`¿Eliminar a ${u.email}?`)) return;
    this.srv.eliminar(u.id).subscribe({
      next: () => {
        this.aviso("Usuario eliminado");
        this.cargar();
      },
      error: (e) => this.aviso(this.msg(e), true),
    });
  }

  nombre(u: AdminUsuario): string {
    return `${u.firstName} ${u.lastName}`.trim();
  }

  private aviso(texto: string, esError = false): void {
    if (esError) {
      this.error.set(texto);
      this.ok.set(null);
    } else {
      this.ok.set(texto);
      this.error.set(null);
    }
    setTimeout(() => {
      this.ok.set(null);
      this.error.set(null);
    }, 4000);
  }

  private msg(e: { error?: { message?: string | string[] } }): string {
    const m = e?.error?.message;
    return (Array.isArray(m) ? m[0] : m) || "Ocurrió un error";
  }
}
