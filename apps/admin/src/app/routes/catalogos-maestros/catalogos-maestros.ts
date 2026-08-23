import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  CampoDef,
  CatalogoMaestro,
  CatalogosMaestrosService,
  EntradaCatalogo,
} from "./catalogos-maestros.service";

/**
 * Gestor de catálogos maestros: plantillas que el wizard de alta copia a cada
 * empresa nueva. Izquierda: lista de catálogos; derecha: entradas del
 * seleccionado con alta/edición/baja según los campos de cada catálogo.
 */
@Component({
  selector: "app-catalogos-maestros",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./catalogos-maestros.html",
  styleUrls: ["./catalogos-maestros.scss"],
})
export class CatalogosMaestros implements OnInit {
  private srv = inject(CatalogosMaestrosService);

  catalogos = signal<CatalogoMaestro[]>([]);
  seleccionKey = signal<string>("");
  entradas = signal<EntradaCatalogo[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  /** Fila en edición (id) o "nueva". */
  editando = signal<string | null>(null);
  form = signal<Record<string, unknown>>({});

  catalogoActual = computed(() =>
    this.catalogos().find((c) => c.key === this.seleccionKey()),
  );

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.srv.catalogos().subscribe({
      next: (c) => {
        this.catalogos.set(c);
        if (c.length && !this.seleccionKey()) this.elegir(c[0].key);
      },
      error: () => this.error.set("No se pudieron cargar los catálogos"),
    });
  }

  elegir(key: string): void {
    this.seleccionKey.set(key);
    this.cancelar();
    this.cargarEntradas();
  }

  private cargarEntradas(): void {
    const key = this.seleccionKey();
    if (!key) return;
    this.cargando.set(true);
    this.srv.entradas(key).subscribe({
      next: (e) => {
        this.entradas.set(e);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set("No se pudieron cargar las entradas");
        this.cargando.set(false);
      },
    });
  }

  private refrescarConteo(): void {
    this.srv.catalogos().subscribe({ next: (c) => this.catalogos.set(c) });
  }

  nueva(): void {
    const base: Record<string, unknown> = {};
    for (const f of this.catalogoActual()?.fields ?? []) {
      base[f.prop] = f.type === "boolean" ? true : "";
    }
    this.form.set(base);
    this.editando.set("nueva");
  }

  editar(e: EntradaCatalogo): void {
    const copia: Record<string, unknown> = {};
    for (const f of this.catalogoActual()?.fields ?? []) copia[f.prop] = e[f.prop];
    this.form.set(copia);
    this.editando.set(e.id);
  }

  cancelar(): void {
    this.editando.set(null);
    this.form.set({});
  }

  setCampo(prop: string, valor: unknown): void {
    this.form.set({ ...this.form(), [prop]: valor });
  }

  guardar(): void {
    const key = this.seleccionKey();
    const modo = this.editando();
    if (!key || !modo) return;
    const body = this.form();
    const req =
      modo === "nueva"
        ? this.srv.crear(key, body)
        : this.srv.actualizar(key, modo, body);
    this.cargando.set(true);
    req.subscribe({
      next: () => {
        this.cancelar();
        this.cargarEntradas();
        this.refrescarConteo();
      },
      error: (err) => {
        this.error.set(err?.error?.message || "No se pudo guardar");
        this.cargando.set(false);
      },
    });
  }

  eliminar(e: EntradaCatalogo): void {
    const key = this.seleccionKey();
    if (!key) return;
    if (!confirm(`¿Eliminar "${e["name"] ?? e.id}" del catálogo maestro?`))
      return;
    this.srv.eliminar(key, e.id).subscribe({
      next: () => {
        this.cargarEntradas();
        this.refrescarConteo();
      },
      error: () => this.error.set("No se pudo eliminar"),
    });
  }

  celda(e: EntradaCatalogo, f: CampoDef): string {
    const v = e[f.prop];
    if (f.type === "boolean") return v ? "Sí" : "No";
    return v === null || v === undefined || v === "" ? "—" : String(v);
  }
}
