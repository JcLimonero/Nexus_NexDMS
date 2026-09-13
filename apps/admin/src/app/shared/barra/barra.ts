import { Component, HostListener, inject, input, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

/**
 * Cabecera del portal: título de la pantalla, navegación y sesión.
 *
 * Al pasar de una pantalla a dos, la cabecera dejó de ser parte de la de
 * clientes y se volvió del portal: si cada una trae la suya acaban
 * desalineadas y la navegación solo existe donde alguien se acordó de ponerla.
 *
 * La sesión (correo + Salir) vive en un menú que cuelga del chip de usuario:
 * así no compite por ancho con la navegación en la barra.
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

  /** Menú de sesión (correo + Salir) que cuelga del chip de usuario. */
  menuAbierto = signal(false);

  alternarMenu(ev: MouseEvent): void {
    // Sin esto, el mismo clic que abre el menú lo cierra con el listener global.
    ev.stopPropagation();
    this.menuAbierto.update((v) => !v);
  }

  /** Un clic fuera cierra el menú. */
  @HostListener("document:click")
  cerrarMenu(): void {
    if (this.menuAbierto()) this.menuAbierto.set(false);
  }

  @HostListener("document:keydown.escape")
  cerrarPorEsc(): void {
    this.menuAbierto.set(false);
  }

  salir(): void {
    this.menuAbierto.set(false);
    this.auth.salir();
  }
}
