import { Component } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-collapse",
  imports: [NgbModule],
  templateUrl: "./collapse.html",
  styleUrls: ["./collapse.scss"],
})
export class Collapse {
  public isCollapsed = false;
}
