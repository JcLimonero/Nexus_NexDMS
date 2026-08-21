import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { GlobalBrandsService } from "../../global-brands.service";
import { GlobalBrand } from "../../models/global-brand.model";
import { FeatherIcons } from "../../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-marcas-globales-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeatherIcons],
  templateUrl: "./marcas-globales-list.html",
  styleUrls: ["./marcas-globales-list.scss"],
})
export class MarcasGlobalesList implements OnInit {
  private globalBrandsService = inject(GlobalBrandsService);
  private toastr = inject(ToastrService);

  brands = signal<GlobalBrand[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchFilter = signal<string>("");

  filteredBrands = computed(() => {
    const term = this.searchFilter().trim().toLowerCase();
    if (!term) return this.brands();
    return this.brands().filter((b) =>
      b.name.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.globalBrandsService.getAll().subscribe({
      next: (brands) => {
        this.brands.set(brands);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar marcas");
      },
    });
  }

  deleteBrand(brand: GlobalBrand): void {
    if (!confirm(`¿Eliminar la marca "${brand.name}"? No se puede deshacer.`)) {
      return;
    }
    this.globalBrandsService.delete(brand.id).subscribe({
      next: () => {
        this.toastr.success("Marca eliminada");
        this.load();
      },
      error: (err) => {
        this.toastr.error(
          err?.error?.message || "Error al eliminar. Puede que tenga modelos asociados.",
        );
      },
    });
  }
}
