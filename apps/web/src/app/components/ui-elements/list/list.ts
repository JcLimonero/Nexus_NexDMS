import { Component } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-list",
  imports: [NgbModule],
  templateUrl: "./list.html",
  styleUrls: ["./list.scss"],
})
export class List {
  public active = 1;
}
