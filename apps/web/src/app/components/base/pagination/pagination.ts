import { Component, ViewEncapsulation, inject } from "@angular/core";

import { NgbModule, NgbPaginationConfig } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-pagination",
  imports: [NgbModule],
  templateUrl: "./pagination.html",
  styleUrls: ["./pagination.scss"],
  encapsulation: ViewEncapsulation.None,
  providers: [NgbPaginationConfig], // add NgbPaginationConfig to the component providers
})
export class Pagination {
  page = 4;
  advancePage = 1;
  currentPage = 3;
  isDisabled = true;

  constructor() {
    const config = inject(NgbPaginationConfig);

    // customize default values of paginations used by this component tree
    config.size = "sm";
    config.boundaryLinks = true;
  }

  toggleDisabled() {
    this.isDisabled = !this.isDisabled;
  }
}
