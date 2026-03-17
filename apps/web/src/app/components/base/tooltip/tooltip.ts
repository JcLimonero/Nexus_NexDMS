import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule, NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-tooltip",
  imports: [NgbModule],
  templateUrl: "./tooltip.html",
  styleUrls: ["./tooltip.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Tooltip {
  name = "World";

  //tooltip toggle
  toggleWithGreeting(tooltip: NgbTooltip, greeting: string) {
    if (tooltip.isOpen()) {
      tooltip.close();
    } else {
      tooltip.open({ greeting });
    }
  }
}
