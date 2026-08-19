import { Component } from "@angular/core";

import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-button-group",
  imports: [NgbDropdownModule],
  templateUrl: "./button-group.html",
  styleUrls: ["./button-group.scss"],
})
export class ButtonGroup {}
