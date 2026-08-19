import { Component, inject } from "@angular/core";

import { NgbCarouselConfig, NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { CarouselModule } from "ngx-owl-carousel-o";

@Component({
  selector: "app-carousel",
  imports: [NgbModule, CarouselModule],
  templateUrl: "./carousel.html",
  styleUrls: ["./carousel.scss"],
  providers: [NgbCarouselConfig], // add NgbCarouselConfig to the component providers
})
export class Carousel {
  showNavigationArrows = false;
  showNavigationIndicators = false;
  images = [
    "assets/images/c1.jpg",
    "assets/images/c2.jpg",
    "assets/images/c3.jpg",
  ];

  constructor() {
    const config = inject(NgbCarouselConfig);

    // customize default values of carousels used by this component tree
    config.showNavigationArrows = true;
    config.showNavigationIndicators = true;
    // customize default values of carousels used by this component tree
    config.interval = 10000;
    config.wrap = false;
    config.keyboard = false;
    config.pauseOnHover = false;
  }
}
