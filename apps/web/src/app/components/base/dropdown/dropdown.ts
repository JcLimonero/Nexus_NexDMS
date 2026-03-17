import { Component, inject } from "@angular/core";

import { NgbDropdownConfig, NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-dropdown",
  imports: [NgbModule],
  templateUrl: "./dropdown.html",
  styleUrls: ["./dropdown.scss"],
  providers: [NgbDropdownConfig], // add NgbDropdownConfig to the component providers
})
export class Dropdown {
  constructor() {
    const config = inject(NgbDropdownConfig);

    // customize default values of dropdowns used by this component tree
    config.placement = "top-left";
    config.autoClose = false;
  }
}
