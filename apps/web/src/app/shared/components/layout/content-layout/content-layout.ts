import { transition, trigger, useAnimation } from "@angular/animations";
import { NgClass } from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  inject,
} from "@angular/core";
import { RouterModule, RouterOutlet } from "@angular/router";

import * as feather from "feather-icons";
import { fadeIn } from "ng-animate";

import { CustomizerService } from "../../../services/customizer.service";
import { NavService } from "../../../services/nav.service";
import { Customizer } from "../../customizer/customizer";
import { Footer } from "../../footer/footer";
import { Header } from "../../header/header";
import { RightSidebar } from "../../right-sidebar/right-sidebar";
import { Sidebar } from "../../sidebar/sidebar";

@Component({
  selector: "app-content-layout",
  imports: [
    Header,
    Sidebar,
    RightSidebar,
    RouterModule,
    Footer,
    Customizer,
    NgClass,
  ],
  templateUrl: "./content-layout.html",
  styleUrls: ["./content-layout.scss"],
  animations: [
    trigger("animateRoute", [
      transition(
        "* => *",
        useAnimation(fadeIn, {
          // Set the duration to 5seconds and delay to 2 seconds
          //params: { timing: 3}
        }),
      ),
    ]),
  ],
})
export class ContentLayout implements AfterViewInit {
  navServices = inject(NavService);
  customizer = inject(CustomizerService);
  private cd = inject(ChangeDetectorRef);

  public right_side_bar: boolean;

  ngAfterViewInit() {
    this.cd.detectChanges();
    setTimeout(() => {
      feather.replace();
    });
  }

  @HostListener("document:click", ["$event"])
  clickedOutside(_event: MouseEvent) {
    // click outside Area perform following action
    document.getElementById("outer-container")!.onclick = function (e) {
      e.stopPropagation();
      if (e.target != document.getElementById("search-outer")) {
        document.getElementsByTagName("body")[0].classList.remove("offcanvas");
      }
      if (e.target != document.getElementById("outer-container")) {
        document
          .getElementById("canvas-bookmark")!
          .classList.remove("offcanvas-bookmark");
      }
    };
  }

  public getRouterOutletState(outlet: RouterOutlet) {
    return outlet.isActivated ? outlet.activatedRoute : "";
  }

  public rightSidebar($event: boolean) {
    this.right_side_bar = $event;
  }
}
