import { Component } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-accordion",
  imports: [NgbModule],
  templateUrl: "./accordion.html",
  styleUrls: ["./accordion.scss"],
})
export class Accordion {
  public items = ["First", "Second", "Third"];
  public toggleCollapse = false;

  onClick() {
    this.toggleCollapse = !this.toggleCollapse;
  }
}
