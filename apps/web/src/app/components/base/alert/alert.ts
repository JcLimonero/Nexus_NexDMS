import { Component, OnInit, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";

interface IAlert {
  type: string;
  message: string;
}

const ALERTS: IAlert[] = [
  {
    type: "success",
    message: "This is an success alert",
  },
  {
    type: "info",
    message: "This is an info alert",
  },
  {
    type: "warning",
    message: "This is a warning alert",
  },
  {
    type: "danger",
    message: "This is a danger alert",
  },
  {
    type: "primary",
    message: "This is a primary alert",
  },
  {
    type: "secondary",
    message: "This is a secondary alert",
  },
  {
    type: "light",
    message: "This is a light alert",
  },
  {
    type: "dark",
    message: "This is a dark alert",
  },
];

@Component({
  selector: "app-alert",
  imports: [NgbModule],
  templateUrl: "./alert.html",
  styleUrls: ["./alert.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Alert implements OnInit {
  private _success = new Subject<string>();
  staticAlertClosed = false;
  successMessage: string | null;
  alerts: IAlert[];

  constructor() {
    this.reset();
  }

  ngOnInit(): void {
    setTimeout(() => (this.staticAlertClosed = true), 20000);
    this._success.subscribe((message) => (this.successMessage = message));
    this._success
      .pipe(debounceTime(5000))
      .subscribe(() => (this.successMessage = null));
  }

  public changeSuccessMessage() {
    this._success.next(`${new Date()} - Message successfully changed.`);
  }

  close(alert: IAlert) {
    this.alerts.splice(this.alerts.indexOf(alert), 1);
  }

  reset() {
    this.alerts = Array.from(ALERTS);
  }
}
