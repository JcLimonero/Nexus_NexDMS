import { Component } from "@angular/core";

@Component({
  selector: "app-loader",
  imports: [],
  templateUrl: "./loader.html",
  styleUrls: ["./loader.scss"],
})
export class Loader {
  public show: boolean = true;

  constructor() {
    setTimeout(() => {
      this.show = false;
    }, 1500);
  }
}
