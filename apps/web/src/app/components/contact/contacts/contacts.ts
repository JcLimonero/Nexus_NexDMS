import { Component, OnInit, inject } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

import {
  ChangeContext,
  NgxSliderModule,
  Options,
} from "@angular-slider/ngx-slider";
import { ToastrModule, ToastrService } from "ngx-toastr";

@Component({
  selector: "app-contacts",
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ToastrModule,
    NgxSliderModule,
  ],
  templateUrl: "./contacts.html",
  styleUrls: ["./contacts.scss"],
})
export class Contacts implements OnInit {
  private router = inject(Router);
  private toastr = inject(ToastrService);

  public searchValue: string = "";
  public user: string;
  public age: number;
  public sidebaron: string;
  public listView: string;

  showDelete() {
    this.toastr.error("User Deleted !");
  }

  public logText: string = "";
  public min: number;
  public value: number = 10;
  public highValue: number = 50;
  public options: Options = {
    floor: 0,
    ceil: 100,
  };

  onUserChangeStart(changeContext: ChangeContext): void {
    this.logText += `onUserChangeStart(${this.getChangeContextString(changeContext)})\n`;
  }

  onUserChange(changeContext: ChangeContext): void {
    this.logText += `onUserChange(${this.getChangeContextString(changeContext)})\n`;
  }

  onUserChangeEnd(changeContext: ChangeContext): void {
    this.logText += `onUserChangeEnd(${this.getChangeContextString(changeContext)})\n`;
  }

  getChangeContextString(changeContext: ChangeContext): void {
    this.min = changeContext.value;
    this.age = changeContext.value;
    this.rangeChange(this.age);
  }

  searchByName() {
    this.searchValue.toLowerCase();
  }

  rangeChange(_event: number) {}

  delete(_val: number) {
    this.router.navigate(["/contact/contacts"]);
  }

  getData() {}
  ngOnInit() {
    this.getData();
  }

  items = [
    {
      id: 1,
      avatar: "assets/images/avatar/7.jpg",
      name: "John",
      surname: "Deo",
      mobile: "44265 55155",
      age: 25,
    },
    {
      id: 2,
      avatar: "assets/images/avatar/8.jpg",
      name: "Elana",
      surname: "John",
      mobile: "44545 54542",
      age: 30,
    },
    {
      id: 3,
      avatar: "assets/images/avatar/11.jpg",
      name: "Meryl",
      surname: "Streep",
      mobile: "84634 48455",
      age: 22,
    },
    {
      id: 4,
      avatar: "assets/images/avatar/16.jpg",
      name: "Emma",
      surname: "Stone",
      mobile: "68254 85542",
      age: 30,
    },
  ];
}
