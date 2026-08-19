import { JsonPipe } from "@angular/common";
import { Component } from "@angular/core";
import {
  AbstractControl,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
} from "@angular/forms";

import { NgbModule, NgbTimeStruct } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-timepicker",
  imports: [NgbModule, FormsModule, ReactiveFormsModule, JsonPipe],
  templateUrl: "./timepicker.html",
  styleUrls: ["./timepicker.scss"],
})
export class Timepicker {
  time = { hour: 13, minute: 30 };
  meridian = true;

  timeSecond: NgbTimeStruct = { hour: 13, minute: 30, second: 30 };
  seconds = true;

  timeSpinners = { hour: 13, minute: 30 };
  spinners = true;

  timeCustom: NgbTimeStruct = { hour: 13, minute: 30, second: 0 };
  hourStep = 1;
  minuteStep = 15;
  secondStep = 30;

  toggleMeridian() {
    this.meridian = !this.meridian;
  }

  toggleSeconds() {
    this.seconds = !this.seconds;
  }

  toggleSpinners() {
    this.spinners = !this.spinners;
  }

  ctrl = new FormControl(
    "",
    (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null;
      }
      if (value.hour < 12) {
        return { tooEarly: true };
      }
      if (value.hour > 13) {
        return { tooLate: true };
      }
      return null;
    },
  );
}
