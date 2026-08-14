import { Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { inject } from "@angular/core";

/**
 * Cabecera del portal: título de la pantalla, navegación y sesión.
 *
 * Al pasar de una pantalla a dos, la cabecera dejó de ser parte de la de
 * clientes y se volvió del portal: si cada una trae la suya acaban
 * desalineadas y la navegación solo existe donde alguien se acordó de ponerla.
 */
@Component({
  selector: "app-barra",
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./barra.html",
  styleUrls: ["./barra.scss"],
})
export class Barra {
  readonly auth = inject(AuthService);

  titulo = input.required<string>();
  subtitulo = input<string>("");
}
