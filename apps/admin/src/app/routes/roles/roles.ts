import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Barra } from "../../shared/barra/barra";
import { RoleAccess, RoleMap, RolesService } from "./roles.service";

/**
 * Catálogo de roles del portal de superadmin.
 *
 * No es una tabla escrita a mano: el backend deriva, recorriendo las rutas de
 * Nest, a qué módulos y operaciones llega cada rol. Aquí se muestra ese mapa
 * para revisarlo y, más adelante, servir de base a los roles a medida.
 */
@Component({
  selector: "app-roles",
  standalone: true,
  imports: [CommonModule, Barra],
  templateUrl: "./roles.html",
  styleUrls: ["./roles.scss"],
})
export class Roles implements OnInit {
  private srv = inject(RolesService);

  mapa = signal<RoleMap | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  rolSeleccionado = signal<string | null>(null);
  soloModulo = signal<string>("");

  rol = computed<RoleAccess | null>(() => {
    const m = this.mapa();
    const r = this.rolSeleccionado();
    if (!m || !r) return null;
    return m.roles.find((x) => x.role === r) ?? null;
  });

  /** Operaciones del rol elegido, filtradas por módulo si se pidió. */
  operaciones = computed(() => {
    const rol = this.rol();
    if (!rol) return [];
    const filtro = this.soloModulo();
    const ops = filtro
      ? rol.operations.filter((o) => o.module === filtro)
      : rol.operations;
    return ops;
  });

  ngOnInit(): void {
    this.srv.getRoleMap().subscribe({
      next: (m) => {
        this.mapa.set(m);
        this.cargando.set(false);
        this.error.set(null);
        if (m.roles.length) this.seleccionar(m.roles[0].role);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || "No se pudo cargar el catálogo");
      },
    });
  }

  etiqueta(role: string): string {
    return this.srv.etiquetaRol(role);
  }

  seleccionar(role: string): void {
    this.rolSeleccionado.set(role);
    this.soloModulo.set("");
  }

  filtrarModulo(key: string): void {
    this.soloModulo.set(this.soloModulo() === key ? "" : key);
  }
}
