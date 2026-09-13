import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toasts } from "./shared/components/toasts/toasts";
import { ConfirmDialog } from "./shared/components/confirm-dialog/confirm-dialog";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, Toasts, ConfirmDialog],
  template: `
    <router-outlet></router-outlet>
    <app-toasts />
    <app-confirm-dialog />
  `,
})
export class AppComponent {}
