import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SaasService } from "../saas.data.service";
import { UsuarioTenant } from "../models";
import { NotificacionService } from "../../../shared/services/notificacion.service";

/**
 * Tab de la ficha: cuentas con las que la empresa entra a cada plataforma
 * (Portal/DMS, Recepción, Técnico). Alta por plataforma, cambio de contraseña y
 * activar/desactivar. Autocontenido: recibe el id de la empresa.
 */
@Component({
  selector: "app-ficha-usuarios",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./ficha-usuarios.html",
  styleUrls: ["./ficha-usuarios.scss"],
})
export class FichaUsuarios implements OnInit {
  private saas = inject(SaasService);
  private noti = inject(NotificacionService);

  tenantId = input.required<string>();

  usuarios = signal<UsuarioTenant[]>([]);
  cargando = signal(false);

  readonly plataformas: { value: string; label: string; role: string; hint: string }[] = [
    { value: "portal", label: "Portal / DMS (administrador)", role: "ADMIN", hint: "app.nexusqsystem.com" },
    { value: "recepcion", label: "Recepción de unidades", role: "RECEPTIONIST", hint: "recepcion.nexusqsystem.com" },
    { value: "tecnico", label: "Técnico (PWA)", role: "MECHANIC", hint: "pwa.nexusqsystem.com" },
  ];
  nuevoUsuario = signal<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    plataforma: string;
  }>({ firstName: "", lastName: "", email: "", password: "", plataforma: "portal" });
  creando = signal(false);
  cambiandoPass = signal<string | null>(null);
  passNueva = signal("");
  filtroRol = signal<string>("");
  filtroEstado = signal<"" | "activos" | "inactivos">("");

  rolesDisponibles = computed<string[]>(() => {
    const set = new Set<string>();
    for (const u of this.usuarios()) for (const r of u.roles) set.add(r);
    return [...set].sort();
  });

  usuariosFiltrados = computed<UsuarioTenant[]>(() => {
    const rol = this.filtroRol();
    const est = this.filtroEstado();
    return this.usuarios().filter((u) => {
      if (rol && !u.roles.includes(rol)) return false;
      if (est === "activos" && !u.isActive) return false;
      if (est === "inactivos" && u.isActive) return false;
      return true;
    });
  });

  constructor() {
    // Recarga si cambia la empresa (por si el contenedor reusa el componente).
    effect(() => {
      const id = this.tenantId();
      if (id) this.cargar(id);
    });
  }

  ngOnInit(): void {
    /* la carga la dispara el effect con el tenantId */
  }

  cargar(tenantId: string): void {
    this.cargando.set(true);
    this.saas.usuarios(tenantId).subscribe({
      next: (u) => {
        this.usuarios.set(u);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.noti.error("No se pudieron cargar los usuarios");
      },
    });
  }

  etiquetaRoles(roles: string[]): string {
    const map: Record<string, string> = {
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      RECEPTIONIST: "Recepción",
      MECHANIC: "Técnico",
      CASHIER: "Cajero",
      WAREHOUSE: "Almacén",
      SELLER: "Vendedor",
    };
    return roles.map((r) => map[r] ?? r).join(", ") || "—";
  }

  crearUsuario(): void {
    const n = this.nuevoUsuario();
    if (!n.firstName.trim() || !n.email.trim() || n.password.length < 8) {
      this.noti.error("Nombre, correo y contraseña (mín. 8) son obligatorios");
      return;
    }
    const plat = this.plataformas.find((p) => p.value === n.plataforma);
    if (!plat) return;
    this.creando.set(true);
    this.saas
      .crearUsuario(this.tenantId(), {
        firstName: n.firstName.trim(),
        lastName: n.lastName.trim(),
        email: n.email.trim().toLowerCase(),
        password: n.password,
        roles: [plat.role],
        scope: "SUCURSAL",
      })
      .subscribe({
        next: () => {
          this.creando.set(false);
          this.noti.ok("Usuario creado");
          this.nuevoUsuario.set({
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            plataforma: n.plataforma,
          });
          this.cargar(this.tenantId());
        },
        error: (e) => {
          this.creando.set(false);
          this.noti.error(e?.error?.message || "No se pudo crear el usuario");
        },
      });
  }

  iniciarCambioPass(userId: string): void {
    this.cambiandoPass.set(userId);
    this.passNueva.set("");
  }

  confirmarCambioPass(u: UsuarioTenant): void {
    const pass = this.passNueva();
    if (pass.length < 8) {
      this.noti.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    this.saas.cambiarContrasena(this.tenantId(), u.id, pass).subscribe({
      next: () => {
        this.cambiandoPass.set(null);
        this.passNueva.set("");
        this.noti.ok(`Contraseña actualizada para ${u.email}`);
      },
      error: (e) =>
        this.noti.error(e?.error?.message || "No se pudo cambiar la contraseña"),
    });
  }

  alternarUsuario(u: UsuarioTenant): void {
    this.saas.alternarUsuario(this.tenantId(), u.id).subscribe({
      next: () => this.cargar(this.tenantId()),
      error: (e) =>
        this.noti.error(e?.error?.message || "No se pudo cambiar el estado"),
    });
  }
}
