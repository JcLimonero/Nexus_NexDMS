import { Component, OnInit, input } from "@angular/core";

import * as feather from "feather-icons";

@Component({
  selector: "app-feather-icons",
  imports: [],
  templateUrl: "./feather-icons.html",
  styleUrls: ["./feather-icons.scss"],
})
export class FeatherIcons implements OnInit {
  public readonly icon = input<string>();

  ngOnInit() {
    setTimeout(() => {
      feather.replace();
    });
  }
}
