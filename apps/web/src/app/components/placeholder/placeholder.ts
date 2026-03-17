import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-placeholder",
  standalone: true,
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-sm-12">
          <div class="card">
            <div class="card-body text-center py-5">
              <i class="icofont icofont-construction text-muted" style="font-size: 4rem;"></i>
              <h5 class="mt-3">{{ titulo }}</h5>
              <p class="text-muted mb-0">Este módulo está en construcción.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Placeholder {
  private route = inject(ActivatedRoute);
  titulo = this.route.snapshot.data["title"] ?? "Módulo";
}
