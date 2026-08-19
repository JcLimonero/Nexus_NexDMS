import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

import { Loader } from "./shared/components/loader/loader";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, Loader],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  title = "endless";
}
