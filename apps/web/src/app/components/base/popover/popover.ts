import { DatePipe } from "@angular/common";
import { Component, ViewEncapsulation, inject } from "@angular/core";

import { NgbModule, NgbPopoverConfig } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-popover",
  imports: [NgbModule, DatePipe],
  templateUrl: "./popover.html",
  styleUrls: ["./popover.scss"],
  encapsulation: ViewEncapsulation.None,
  providers: [NgbPopoverConfig], // add NgbPopoverConfig to the component providers
})
export class Popover {
  name = "World";
  lastShown: Date;
  lastHidden: Date;

  constructor() {
    const config = inject(NgbPopoverConfig);

    // customize default values of popovers used by this component tree
    config.placement = "top";
    config.triggers = "click";
  }

  //Tooltip greeting on click as well as hover
  toggleWithGreeting(
    popover: {
      isOpen: () => unknown;
      close: () => void;
      open: (arg0: { greeting: string; language: string }) => void;
    },
    greeting: string,
    language: string,
  ) {
    if (popover.isOpen()) {
      popover.close();
    } else {
      popover.open({ greeting, language });
    }
  }

  recordShown() {
    this.lastShown = new Date();
  }

  recordHidden() {
    this.lastHidden = new Date();
  }
}
