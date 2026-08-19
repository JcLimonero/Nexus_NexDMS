import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";

import { CatalogoService } from "../../catalogo.service";
import { GlobalModel } from "../../models/modelo-global.model";

@Component({
  selector: "app-variante-detail",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./variante-detail.html",
  styleUrls: ["./variante-detail.scss"],
})
export class VarianteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogoService = inject(CatalogoService);
  private toastr = inject(ToastrService);

  model = signal<GlobalModel | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/catalog"]);
      return;
    }

    this.catalogoService.getById(id).subscribe({
      next: (m) => {
        this.model.set(m);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Error al cargar variante");
      },
    });
  }

  getDisplayLabel(m: GlobalModel): string {
    return this.catalogoService.getDisplayLabel(m);
  }

  getVehicleTypeLabel(m: GlobalModel): string {
    return this.catalogoService.getVehicleTypeLabel(m);
  }

  getCombustionTypeLabel(m: GlobalModel): string {
    return this.catalogoService.getCombustionTypeLabel(m);
  }
}
