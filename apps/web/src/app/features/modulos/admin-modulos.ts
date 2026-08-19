import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import {
  CatalogModule,
  ModulesService,
} from "../../shared/services/modules.service";

const PLAN_LABEL: Record<string, string> = {
  BASIC: "Básico",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

/**
 * Administración de módulos del tenant. El plan define el universo
 * contratado; aquí se encienden o apagan módulos dentro de ese universo.
 */
@Component({
  selector: "app-admin-modulos",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./admin-modulos.html",
  styleUrls: ["./admin-modulos.scss"],
})
export class AdminModulos implements OnInit {
  private modulesService = inject(ModulesService);
  private toastr = inject(ToastrService);

  plan = signal<string>("");
  catalog = signal<CatalogModule[]>([]);
  loading = signal(true);
  saving = signal(false);

  /** Selección local; se persiste al guardar. */
  selected = signal<Set<string>>(new Set());

  incluidos = computed(() => this.catalog().filter((m) => m.includedInPlan));
  bloqueados = computed(() => this.catalog().filter((m) => !m.includedInPlan));

  activosCount = computed(
    () => this.incluidos().filter((m) => this.isOn(m)).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.modulesService.catalog().subscribe({
      next: (res) => {
        this.plan.set(res.plan);
        this.catalog.set(res.modules);
        this.selected.set(
          new Set(res.modules.filter((m) => m.active).map((m) => m.key)),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  planLabel(p: string): string {
    return PLAN_LABEL[p] ?? p;
  }

  isOn(m: CatalogModule): boolean {
    return m.core || this.selected().has(m.key);
  }

  toggle(m: CatalogModule): void {
    if (m.core || !m.includedInPlan) return;
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(m.key) ? next.delete(m.key) : next.add(m.key);
      return next;
    });
  }

  save(): void {
    this.saving.set(true);
    const keys = this.incluidos()
      .filter((m) => this.isOn(m))
      .map((m) => m.key);
    this.modulesService.setModules(keys).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastr.success("Módulos actualizados. Recarga para ver el menú.");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toastr.error(err?.error?.message || "Error al guardar");
      },
    });
  }

  activarTodos(): void {
    this.selected.set(new Set(this.incluidos().map((m) => m.key)));
  }
}
