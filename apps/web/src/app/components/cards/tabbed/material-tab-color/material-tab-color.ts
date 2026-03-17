import { Component, input } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-material-tab-color",
  imports: [NgbModule],
  templateUrl: "./material-tab-color.html",
  styleUrls: ["./material-tab-color.scss"],
})
export class MaterialTabColor {
  readonly color = input<string>();
}
