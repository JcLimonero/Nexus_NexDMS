import { Component, ViewEncapsulation, inject } from "@angular/core";
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { NgbModule, NgbRatingConfig } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-rating",
  imports: [NgbModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./rating.html",
  styleUrls: ["./rating.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Rating {
  currentRate = 6;
  selected = 0;
  hovered = 0;
  readonly = false;
  heartRate = 5;

  constructor() {
    const config = inject(NgbRatingConfig);

    config.max = 5;
    config.readonly = true;
  }

  ctrl = new FormControl(null, Validators.required);

  toggle() {
    if (this.ctrl.disabled) {
      this.ctrl.enable();
    } else {
      this.ctrl.disable();
    }
  }
}
