import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-configuracion-landing",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./configuracion-landing.html",
  styleUrls: ["./configuracion-landing.scss"],
})
export class ConfiguracionLanding {}
