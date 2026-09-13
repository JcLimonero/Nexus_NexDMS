import {
  Component,
  ElementRef,
  forwardRef,
  input,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

/**
 * Editor de texto enriquecido reutilizable.
 *
 * WYSIWYG mínimo (negritas, cursiva, subrayado, títulos, listas y enlaces) que
 * emite HTML. Implementa ControlValueAccessor, así que se usa con `[(ngModel)]`
 * o `formControlName` como cualquier input. Sin dependencias externas
 * (contenteditable + comandos del navegador), para que sea fácil de reutilizar
 * en cualquier pantalla (plantillas de documentos, notas, descripciones…).
 */
@Component({
  selector: "app-editor-html",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./editor-html.html",
  styleUrls: ["./editor-html.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorHtml),
      multi: true,
    },
  ],
})
export class EditorHtml implements ControlValueAccessor {
  /** Texto de ayuda cuando está vacío. */
  placeholder = input<string>("Escribe aquí…");

  private readonly area = viewChild.required<ElementRef<HTMLDivElement>>("area");

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  // ── ControlValueAccessor ──
  writeValue(v: string | null): void {
    const el = this.area().nativeElement;
    el.innerHTML = v ?? "";
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(v: boolean): void {
    this.disabled = v;
    this.area().nativeElement.contentEditable = v ? "false" : "true";
  }

  // ── Edición ──
  alEscribir(): void {
    this.onChange(this.area().nativeElement.innerHTML);
  }

  alSalir(): void {
    this.onTouched();
  }

  /** Ejecuta un comando de formato sobre la selección. */
  comando(cmd: string, valor?: string): void {
    this.area().nativeElement.focus();
    document.execCommand(cmd, false, valor);
    this.alEscribir();
  }

  bloque(tag: string): void {
    this.comando("formatBlock", tag);
  }

  enlace(): void {
    const url = window.prompt("URL del enlace:", "https://");
    if (url) this.comando("createLink", url);
  }
}
