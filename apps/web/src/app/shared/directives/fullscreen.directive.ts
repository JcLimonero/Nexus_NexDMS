import { Directive, HostListener } from "@angular/core";

@Directive({
  standalone: true,
  selector: "[toggleFullscreen]",
})
export class ToggleFullscreenDirective {
  @HostListener("click") onClick() {}
}
