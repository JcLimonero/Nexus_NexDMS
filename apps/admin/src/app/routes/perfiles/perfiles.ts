import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Barra } from "../../shared/barra/barra";
import { TenantsService, Tenant } from "../tenants/tenants.service";
import { RoleMap, RolesService } from "../roles/roles.service";
import { CustomRole, PerfilesService } from "./perfiles.service";

/**
 * Roles a medida por cliente. Cada tenant arma perfiles con nombre propio a
 * partir de los roles base del sistema; el perfil alcanza la unión de lo que
 * esos roles base alcanzan. La cobertura se previsualiza con el mapa de roles
 * (el mismo cimiento del catálogo).
 */
@Component({
  selector: "app-perfiles",
  standalone: true,
  imports: [CommonModule, FormsModule, Barra],
  templateUrl: "./perfiles.html",
  styleUrls: ["./perfiles.scss"],
})
export class Perfiles implements OnInit {
  private tenantsSrv = inject(TenantsService);
  private rolesSrv = inject(RolesService);
  private srv = inject(PerfilesService);

  tenants = signal<Tenant[]>([]);
  tenantId = signal<string>("");
  mapa = signal<RoleMap | null>(null);
  perfiles = signal<CustomRole[]>([]);
  cargando = signal(true);
  aviso = signal<{ texto: string; tono: "bien" | "mal" } | null>(null);

  // Formulario
  editandoId = signal<string | null>(null);
  nombre = "";
  descripcion = "";
  seleccion = signal<Set<string>>(new Set());
  guardando = signal(false);

  /** Roles base ofrecibles: todos menos el de plataforma. */
  basesDisponibles = computed(() =>
    (this.mapa()?.roles ?? []).filter((r) => r.role !== "SUPERADMIN"),
  );

  /** Vista previa de módulos que cubriría la selección actual. */
  vistaPrevia = computed(() => {
    const m = this.mapa();
    if (!m) return [];
    const sel = this.seleccion();
    const modulos = new Map<string, string>();
    for (const base of sel) {
      const acceso = m.roles.find((r) => r.role === base);
      acceso?.modules.forEach((mod) => modulos.set(mod.key, mod.name));
    }
    return [...modulos.values()].sort();
  });

  ngOnInit(): void {
    this.rolesSrv.getRoleMap().subscribe({
      next: (m) => this.mapa.set(m),
    });
    this.tenantsSrv.listar().subscribe({
      next: (list) => {
        this.tenants.set(list);
        this.cargando.set(false);
        if (list.length) {
          this.tenantId.set(list[0].id);
          this.cargarPerfiles();
        }
      },
      error: () => {
        this.cargando.set(false);
        this.aviso.set({ texto: "No se pudieron cargar los clientes", tono: "mal" });
      },
    });
  }

  etiqueta(role: string): string {
    return this.rolesSrv.etiquetaRol(role);
  }

  onTenantChange(id: string): void {
    this.tenantId.set(id);
    this.cancelar();
    this.cargarPerfiles();
  }

  cargarPerfiles(): void {
    const t = this.tenantId();
    if (!t) return;
    this.srv.list(t).subscribe({
      next: (list) => this.perfiles.set(list),
      error: () =>
        this.aviso.set({ texto: "No se pudieron cargar los perfiles", tono: "mal" }),
    });
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.nombre = "";
    this.descripcion = "";
    this.seleccion.set(new Set());
  }

  editar(p: CustomRole): void {
    this.editandoId.set(p.id);
    this.nombre = p.name;
    this.descripcion = p.description ?? "";
    this.seleccion.set(new Set(p.baseRoles));
  }

  cancelar(): void {
    this.editandoId.set(null);
    this.nombre = "";
    this.descripcion = "";
    this.seleccion.set(new Set());
  }

  toggleBase(role: string): void {
    const set = new Set(this.seleccion());
    if (set.has(role)) set.delete(role);
    else set.add(role);
    this.seleccion.set(set);
  }

  seleccionado(role: string): boolean {
    return this.seleccion().has(role);
  }

  guardar(): void {
    if (this.guardando()) return;
    const nombre = this.nombre.trim();
    const baseRoles = [...this.seleccion()];
    if (nombre.length < 2) {
      this.aviso.set({ texto: "El nombre es muy corto", tono: "mal" });
      return;
    }
    if (baseRoles.length === 0) {
      this.aviso.set({ texto: "Elige al menos un rol base", tono: "mal" });
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const dto = {
      name: nombre,
      baseRoles,
      description: this.descripcion.trim() || undefined,
    };
    const req = id
      ? this.srv.update(id, dto)
      : this.srv.create({ ...dto, tenantId: this.tenantId() });
    req.subscribe({
      next: () => {
        this.guardando.set(false);
        this.aviso.set({
          texto: id ? "Perfil actualizado" : "Perfil creado",
          tono: "bien",
        });
        this.cancelar();
        this.cargarPerfiles();
      },
      error: (err) => {
        this.guardando.set(false);
        this.aviso.set({
          texto: err?.error?.message || "No se pudo guardar",
          tono: "mal",
        });
      },
    });
  }

  eliminar(p: CustomRole): void {
    if (!confirm(`¿Eliminar el perfil "${p.name}"?`)) return;
    this.srv.remove(p.id).subscribe({
      next: () => {
        this.aviso.set({ texto: "Perfil eliminado", tono: "bien" });
        if (this.editandoId() === p.id) this.cancelar();
        this.cargarPerfiles();
      },
      error: (err) =>
        this.aviso.set({
          texto: err?.error?.message || "No se pudo eliminar",
          tono: "mal",
        }),
    });
  }
}
