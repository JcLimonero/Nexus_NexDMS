import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

interface DatosPerfil {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles?: string[];
  scope?: string;
  branch?: { id: string; name: string } | null;
  legalEntity?: { id: string; name: string } | null;
  tenant?: { id: string; name: string } | null;
}

/**
 * Mi perfil.
 *
 * El menú del usuario ofrecía "Editar perfil" desde la plantilla, pero no
 * llevaba a ninguna parte. Aquí se muestran los datos de la sesión y se
 * permite lo único que el propio usuario puede cambiar por su cuenta: su
 * contraseña. El resto —rol, sucursal, alcance— lo administra quien gestiona
 * usuarios, así que se muestra en solo lectura.
 */
@Component({
  selector: "app-perfil",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./perfil.html",
  styleUrls: ["./perfil.scss"],
})
export class Perfil implements OnInit {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);

  cargando = signal(true);
  perfil = signal<DatosPerfil | null>(null);
  guardando = signal(false);

  actual = "";
  nueva = "";
  confirmar = "";

  ngOnInit(): void {
    this.http.get<DatosPerfil>("/api/v1/auth/me").subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  nombre(): string {
    const p = this.perfil();
    return p ? `${p.firstName} ${p.lastName}`.trim() : "";
  }

  iniciales(): string {
    const p = this.perfil();
    if (!p) return "";
    return `${p.firstName?.[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase();
  }

  rolTexto(): string {
    const roles = this.perfil()?.roles ?? [];
    const m: Record<string, string> = {
      SUPERADMIN: "Superadministrador",
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      CASHIER: "Cajero",
      MECHANIC: "Técnico",
      RECEPTIONIST: "Recepción",
      SALES: "Ventas",
    };
    return roles.map((r) => m[r] ?? r).join(", ") || "—";
  }

  alcanceTexto(): string {
    const p = this.perfil();
    const m: Record<string, string> = {
      GLOBAL: "Todo el grupo",
      LEGAL_ENTITY: "Razón social",
      SUCURSAL: "Sucursal",
    };
    return p?.scope ? (m[p.scope] ?? p.scope) : "—";
  }

  cambiarContrasena(): void {
    if (this.guardando()) return;
    if (this.nueva !== this.confirmar) {
      this.toastr.warning("La nueva contraseña y su confirmación no coinciden");
      return;
    }
    // El backend exige 8 caracteres y al menos un número; se avisa antes de
    // mandar para no gastar un viaje en algo que ya sabemos.
    if (this.nueva.length < 8 || !/\d/.test(this.nueva)) {
      this.toastr.warning(
        "La nueva contraseña necesita al menos 8 caracteres y un número",
      );
      return;
    }
    this.guardando.set(true);
    this.http
      .patch("/api/v1/auth/change-password", {
        currentPassword: this.actual,
        newPassword: this.nueva,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.actual = this.nueva = this.confirmar = "";
          this.toastr.success("Contraseña actualizada");
        },
        error: (e) => {
          this.guardando.set(false);
          const msg = e?.error?.message;
          this.toastr.error(
            Array.isArray(msg) ? msg[0] : msg || "No se pudo cambiar",
          );
        },
      });
  }
}
