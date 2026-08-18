import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { Importador } from "../../../shared/components/importador/importador";

import { CatalogoService } from "../../catalogo/catalogo.service";
import { GlobalModel } from "../../catalogo/models/modelo-global.model";
import { Accesorio, AccesoriosService } from "./accesorios.service";

/**
 * Catálogo de accesorios: lo que se vende con la unidad.
 *
 * Vive junto a las refacciones porque se dan de alta igual —un SKU, un
 * precio, una clave del SAT— y quien administra el inventario administra las
 * dos cosas. Lo que cambia es a qué se aplican: la refacción se monta en un
 * servicio y el accesorio se vende con la unidad.
 */
@Component({
  selector: "app-accesorios",
  standalone: true,
  imports: [MoneyPipe, CommonModule, FormsModule, RouterModule, Importador],
  templateUrl: "./accesorios.html",
  styleUrls: ["./accesorios.scss"],
})
export class Accesorios implements OnInit {
  private srv = inject(AccesoriosService);
  private catalogoSrv = inject(CatalogoService);

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal<{ texto: string; tono: "ok" | "error" } | null>(null);

  accesorios = signal<Accesorio[]>([]);
  modelos = signal<GlobalModel[]>([]);
  filtro = signal<"todos" | "universales" | "por-modelo">("todos");
  busqueda = "";

  /** Las familias que existen, sacadas de lo que hay dado de alta. */
  categorias = computed(() => {
    const c = new Set(
      this.accesorios()
        .map((a) => a.category)
        .filter((x): x is string => !!x),
    );
    return [...c].sort();
  });

  visibles = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    return this.accesorios().filter((a) => {
      if (this.filtro() === "universales" && !a.isUniversal) return false;
      if (this.filtro() === "por-modelo" && a.isUniversal) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.sku ?? "").toLowerCase().includes(q) ||
        (a.category ?? "").toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.cargar();
    // Los modelos alimentan la compatibilidad; se piden de golpe porque el
    // diálogo los necesita completos para poder buscar dentro.
    this.catalogoSrv.getAll({ limit: 500 } as never).subscribe({
      next: (r) => this.modelos.set(r.data ?? []),
    });
  }

  private avisar(texto: string, tono: "ok" | "error" = "ok"): void {
    this.aviso.set({ texto, tono });
    setTimeout(() => this.aviso.set(null), 4000);
  }

  cargar(): void {
    this.cargando.set(true);
    this.srv.listar(true).subscribe({
      next: (a) => {
        this.accesorios.set(a);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisar(e?.error?.message || "No se pudo cargar", "error");
      },
    });
  }

  nombreModelo(m: GlobalModel): string {
    return `${m.brand?.name ?? ""} ${m.model} ${m.version} ${m.year}`.trim();
  }

  /** A qué monta, en una línea, para verlo sin abrir el detalle. */
  aplicaA(a: Accesorio): string {
    if (a.isUniversal) return "Cualquier unidad";
    const n = a.compatibilities?.length ?? 0;
    if (!n) {
      // Ni universal ni con modelos: no lo va a ofrecer nadie. Se dice, en
      // vez de dejarlo con un guion que parece un dato que falta.
      return "Sin modelos — no se ofrecerá";
    }
    if (n === 1) {
      const gm = a.compatibilities![0].globalModel;
      return gm ? `${gm.brand?.name ?? ""} ${gm.model} ${gm.year}`.trim() : "1 modelo";
    }
    return `${n} modelos`;
  }

  sinAplicacion(a: Accesorio): boolean {
    return !a.isUniversal && !(a.compatibilities?.length ?? 0);
  }

  // ─── Alta y edición ─────────────────────────────────────────

  abierto = signal(false);
  editando = signal<Accesorio | null>(null);
  form = {
    name: "",
    sku: "",
    price: 0,
    category: "",
    satProductKey: "",
    description: "",
    isUniversal: false,
    isActive: true,
    globalModelIds: [] as string[],
  };
  busquedaModelo = "";

  modelosFiltrados = computed(() => {
    const q = this.busquedaModelo.trim().toLowerCase();
    if (!q) return this.modelos().slice(0, 30);
    return this.modelos()
      .filter((m) => this.nombreModelo(m).toLowerCase().includes(q))
      .slice(0, 30);
  });

  nuevo(): void {
    this.editando.set(null);
    this.form = {
      name: "",
      sku: "",
      price: 0,
      category: "",
      satProductKey: "",
      description: "",
      isUniversal: false,
      isActive: true,
      globalModelIds: [],
    };
    this.busquedaModelo = "";
    this.abierto.set(true);
  }

  editar(a: Accesorio): void {
    this.editando.set(a);
    this.form = {
      name: a.name,
      sku: a.sku ?? "",
      price: Number(a.price),
      category: a.category ?? "",
      satProductKey: a.satProductKey ?? "",
      description: a.description ?? "",
      isUniversal: a.isUniversal,
      isActive: a.isActive,
      globalModelIds: (a.compatibilities ?? []).map((c) => c.globalModelId),
    };
    this.busquedaModelo = "";
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
    this.editando.set(null);
  }

  tieneModelo(id: string): boolean {
    return this.form.globalModelIds.includes(id);
  }

  alternarModelo(id: string): void {
    this.form.globalModelIds = this.tieneModelo(id)
      ? this.form.globalModelIds.filter((x) => x !== id)
      : [...this.form.globalModelIds, id];
  }

  guardar(): void {
    if (!this.form.name.trim()) {
      this.avisar("Falta el nombre del accesorio", "error");
      return;
    }
    if (!this.form.isUniversal && !this.form.globalModelIds.length) {
      this.avisar(
        "Marca los modelos en los que monta, o márcalo como universal",
        "error",
      );
      return;
    }

    this.guardando.set(true);
    const dto = {
      name: this.form.name.trim(),
      sku: this.form.sku || undefined,
      price: Number(this.form.price),
      category: this.form.category || undefined,
      satProductKey: this.form.satProductKey || undefined,
      description: this.form.description || undefined,
      isUniversal: this.form.isUniversal,
      isActive: this.form.isActive,
      // Un universal no guarda modelos: monta en todo, y una lista suelta
      // ahí solo sería un dato que nadie mira y que engaña al siguiente.
      globalModelIds: this.form.isUniversal ? [] : this.form.globalModelIds,
    };

    const actual = this.editando();
    const peticion = actual
      ? this.srv.actualizar(actual.id, dto)
      : this.srv.crear(dto);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(actual ? "Accesorio actualizado" : "Accesorio dado de alta");
        this.cerrar();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        const m = e?.error?.message;
        this.avisar(Array.isArray(m) ? m[0] : m || "No se pudo guardar", "error");
      },
    });
  }

  alternarActivo(a: Accesorio): void {
    this.srv.actualizar(a.id, { isActive: !a.isActive }).subscribe({
      next: () => {
        this.avisar(a.isActive ? "Accesorio dado de baja" : "Accesorio activado");
        this.cargar();
      },
      error: () => this.avisar("No se pudo cambiar", "error"),
    });
  }
}
