import { Component } from "@angular/core";

import { NgbModule, NgbNavChangeEvent } from "@ng-bootstrap/ng-bootstrap";
// import {NgbTabChangeEvent} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: "app-tabset",
  imports: [NgbModule],
  templateUrl: "./tabset.html",
  styleUrls: ["./tabset.scss"],
})
export class Tabset {
  currentJustify = "start";
  currentOrientation = "horizontal";

  public active1 = 1;
  public active2 = 1;
  public active3 = 1;
  public active4 = 1;
  disabled = true;

  onNavChange1(changeEvent: NgbNavChangeEvent) {
    if (changeEvent.nextId === 3) {
      changeEvent.preventDefault();
    }
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    if (changeEvent.nextId === 3) {
      changeEvent.preventDefault();
    }
  }
}
