import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-billing-plan",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./billing-plan.html",
  styleUrls: ["./billing-plan.scss"],
})
export class BillingPlan {}
