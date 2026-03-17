import { Component, input } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-color-option",
  imports: [NgbModule],
  templateUrl: "./color-option.html",
  styleUrls: ["./color-option.scss"],
})
export class ColorOption {
  readonly color = input<string>();
}
