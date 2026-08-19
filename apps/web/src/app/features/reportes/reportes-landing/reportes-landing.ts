import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-reportes-landing",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./reportes-landing.html",
  styleUrls: ["./reportes-landing.scss"],
})
export class ReportesLanding {}
