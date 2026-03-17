import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { InventarioUnidadesService } from "../../inventario-unidades.service";

@Component({
  selector: "app-expediente-redirect",
  standalone: true,
  template: `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando expediente...</span>
      </div>
      <p class="mt-2 text-muted">Redirigiendo a documentos del vendedor...</p>
    </div>
  `,
})
export class ExpedienteRedirect implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioUnidadesService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/units-inventory"]);
      return;
    }

    this.inventarioService.getExpedienteStatus(id).subscribe({
      next: (status) => {
        if (status.lastReturn) {
          this.router.navigate(
            [
              "/units-inventory",
              id,
              "recompra",
              status.lastReturn.id,
              "expediente",
            ],
            { replaceUrl: true }
          );
        } else {
          this.router.navigate(
            ["/units-inventory", id, "recompra"],
            { replaceUrl: true }
          );
        }
      },
      error: () => {
        this.router.navigate(["/units-inventory", id]);
      },
    });
  }
}
