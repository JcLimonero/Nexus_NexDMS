import { MoneyPipe } from "../../shared/pipes/money.pipe";
import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";

/**
 * Lo que devuelve `/auth/me`.
 *
 * Los identificadores vienen planos y los nombres en las listas de acceso,
 * no como objetos anidados. La pantalla los pedía anidados, así que sucursal
 * y razón social salían siempre en blanco.
 */
interface DatosPerfil {
  id: string;
  tenantId: string;
  branchId: string | null;
  legalEntityId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  roles?: string[];
  scope?: string;
  branches?: {
    branchId: string;
    branchName: string;
    legalEntityId: string;
    legalEntityName: string;
  }[];
  legalEntities?: { id: string; name: string }[];
}

/** Lo que el grupo paga por usar NexDMS. */
interface Suscripcion {
  tenant: { name: string; billingDay: number | null };
  cobro: {
    plan: { key: string; name: string; precio: number };
    extras: { key: string; name: string; precio: number }[];
    total: number;
    moneda: string;
  };
  modulos: { activos: number; incluidosEnPlan: number; extras: string[] };
  pagos: {
    id: string;
    period: string;
    amount: number;
    status: string;
    paidAt: string | null;
    method: string | null;
    reference: string | null;
    vencido?: boolean;
  }[];
  resumen: {
    totalPagado: number;
    mesesPagados: number;
    vencidos: number;
    adeudo: number;
    antiguedadMeses: number | null;
  };
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
  imports: [MoneyPipe, CommonModule, FormsModule],
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

  /**
   * La suscripción al SaaS, aquí y no en el menú.
   *
   * Lo que el grupo paga por usar NexDMS no es operación del taller: no le
   * incumbe a quien factura a un cliente o recibe una unidad, y mezclarlo
   * con la facturación del concesionario confundía las dos cosas. Solo lo
   * ve quien administra la cuenta.
   */
  suscripcion = signal<Suscripcion | null>(null);

  esSuperadmin(): boolean {
    return (this.perfil()?.roles ?? []).includes("SUPERADMIN");
  }

  ngOnInit(): void {
    this.http.get<DatosPerfil>("/api/v1/auth/me").subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
        if (this.esSuperadmin() && p.tenantId) this.cargarSuscripcion(p.tenantId);
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarSuscripcion(tenantId: string): void {
    this.http.get<Suscripcion>(`/api/v1/saas/tenants/${tenantId}`).subscribe({
      // Si no alcanza el endpoint no se enseña la sección: es información de
      // la cuenta, no algo que deba fallar a la vista de todos.
      next: (s) => this.suscripcion.set(s),
      error: () => this.suscripcion.set(null),
    });
  }

  etiquetaPago(p: { status: string; vencido?: boolean }): string {
    if (p.vencido) return "Vencido";
    return (
      { PAGADO: "Pagado", PENDIENTE: "Pendiente", CANCELADO: "Cancelado" }[
        p.status
      ] ?? p.status
    );
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
  /** La sucursal activa, resuelta contra las que tiene asignadas. */
  sucursal(): string {
    const p = this.perfil();
    return (
      p?.branches?.find((b) => b.branchId === p.branchId)?.branchName ?? "—"
    );
  }

  razonSocial(): string {
    const p = this.perfil();
    return (
      p?.legalEntities?.find((l) => l.id === p.legalEntityId)?.name ??
      p?.branches?.find((b) => b.branchId === p.branchId)?.legalEntityName ??
      "—"
    );
  }

}
