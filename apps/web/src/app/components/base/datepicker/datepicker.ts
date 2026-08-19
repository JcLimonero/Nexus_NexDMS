import { JsonPipe } from "@angular/common";
import { Component, inject, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  NgbCalendar,
  NgbDate,
  NgbDatepickerModule,
  NgbDateStruct,
} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-datepicker",
  imports: [NgbDatepickerModule, FormsModule, JsonPipe],
  templateUrl: "./datepicker.html",
  styleUrls: ["./datepicker.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Datepicker {
  private calendar = inject(NgbCalendar);

  model: NgbDateStruct;
  date: { year: number; month: number };
  modelDisabled: NgbDateStruct;
  disabled = true;
  modelCustom: NgbDateStruct;
  displayMonths = 2;
  navigation = "select";
  showWeekNumbers = false;
  outsideDays = "visible";
  public hoveredDate: NgbDate | null = null;
  fromDate: NgbDate;
  public toDate: NgbDate | null;
  modelFooter: NgbDateStruct;
  today: NgbDate;

  constructor() {
    const calendar = this.calendar;

    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), "d", 10);

    this.today = this.calendar.getToday();
  }

  selectToday() {
    this.model = this.calendar.getToday();
  }

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (
      this.fromDate &&
      !this.toDate &&
      date &&
      date.after(this.fromDate)
    ) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }
  }
  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      date.equals(this.toDate) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }
}
