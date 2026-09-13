import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  output,
} from "@angular/core";
import { ConfirmService } from "../services/confirm.service";

/**
 * Comportamiento común de diálogos: cerrar con Esc y llevar el foco al panel
 * al abrir (accesibilidad). Úsese en el contenedor `.dialogo`:
 *   <div class="dialogo" appEsc (esc)="cerrar()"> …
 *
 * Es consciente del apilamiento: si hay varios diálogos abiertos, Esc solo
 * cierra el de encima; y cede si hay un confirm abierto (ese tiene su propio Esc).
 */
@Directive({
  selector: "[appEsc]",
  standalone: true,
})
export class EscDirective implements AfterViewInit, OnDestroy {
  /** Pila de diálogos abiertos, en orden de apertura. */
  private static pila: EscDirective[] = [];

  private el = inject(ElementRef<HTMLElement>);
  private confirm = inject(ConfirmService);
  readonly esc = output<void>();

  ngAfterViewInit(): void {
    EscDirective.pila.push(this);
    const host = this.el.nativeElement;
    if (!host.hasAttribute("tabindex")) host.setAttribute("tabindex", "-1");
    queueMicrotask(() => host.focus?.());
  }

  ngOnDestroy(): void {
    EscDirective.pila = EscDirective.pila.filter((d) => d !== this);
  }

  @HostListener("document:keydown.escape")
  onEsc(): void {
    // Si hay un confirm abierto, él maneja el Esc.
    if (this.confirm.estado()) return;
    // Solo el diálogo de encima responde.
    if (EscDirective.pila[EscDirective.pila.length - 1] === this) {
      this.esc.emit();
    }
  }
}
