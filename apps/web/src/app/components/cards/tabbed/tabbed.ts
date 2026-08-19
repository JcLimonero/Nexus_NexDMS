import { Component } from "@angular/core";

import { ColorOption } from "./color-option/color-option";
import { ColorTab } from "./color-tab/color-tab";
import { MaterialTabColor } from "./material-tab-color/material-tab-color";
import { SimpleTab } from "./simple-tab/simple-tab";

@Component({
  selector: "app-tabbed",
  imports: [SimpleTab, MaterialTabColor, ColorTab, ColorOption],
  templateUrl: "./tabbed.html",
  styleUrls: ["./tabbed.scss"],
})
export class Tabbed {
  public active = 1;
  public materialSuccess = "success";
  public materialSecondary = "secondary";
}
