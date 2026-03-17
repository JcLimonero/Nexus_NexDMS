import { Component } from "@angular/core";

import { CarouselModule } from "ngx-owl-carousel-o";

@Component({
  selector: "app-owl-carousel",
  imports: [CarouselModule],
  templateUrl: "./owl-carousel.html",
  styleUrls: ["./owl-carousel.scss"],
})
export class OwlCarousel {
  owlCarousel1 = [
    { img: "assets/images/slider/1.jpg" },
    { img: "assets/images/slider/2.jpg" },
    { img: "assets/images/slider/3.jpg" },
    { img: "assets/images/slider/4.jpg" },
    { img: "assets/images/slider/5.jpg" },
    { img: "assets/images/slider/6.jpg" },
    { img: "assets/images/slider/7.jpg" },
    { img: "assets/images/slider/8.jpg" },
    { img: "assets/images/slider/9.jpg" },
    { img: "assets/images/slider/10.jpg" },
  ];

  //Options
  owlCarousel1Options = {
    loop: true,
    margin: 10,
    nav: false,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 3,
      },
      1000: {
        items: 5,
      },
    },
  };

  owlCarousel2Options = {
    loop: true,
    margin: 10,
    items: 5,
    nav: false,
    responsive: {
      576: {
        items: 1,
      },
      768: {
        items: 2,
      },
      992: {
        items: 3,
      },
    },
  };

  owlCarousel3Options = {
    center: true,
    items: 5,
    loop: true,
    margin: 10,
    nav: false,
    responsive: {
      576: {
        items: 1,
      },
      768: {
        items: 2,
      },
      992: {
        items: 3,
      },
    },
  };

  owlCarousel4Options = {
    items: 5,
    loop: true,
    margin: 10,
    merge: true,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel5Options = {
    margin: 10,
    loop: true,
    autoWidth: true,
    items: 5,
    nav: false,
  };

  owlCarousel6Options = {
    items: 5,
    loop: false,
    center: true,
    margin: 10,
    URLhashListener: true,
    autoplayHoverPause: true,
    startPosition: "URLHash",
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel7Options = {
    stagePadding: 50,
    loop: true,
    margin: 10,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel8Options = {
    stagePadding: 50,
    loop: true,
    margin: 10,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel9Options = {
    rtl: true,
    loop: true,
    margin: 10,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel10Options = {
    items: 5,
    lazyLoad: true,
    loop: true,
    margin: 5,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel12Options = {
    animateOut: "slideOutDown",
    animateIn: "flipInX",
    items: 5,
    margin: 30,
    stagePadding: 30,
    smartSpeed: 450,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel13Options = {
    items: 5,
    loop: true,
    margin: 10,
    autoplay: true,
    autoplayTimeout: 1000,
    autoplayHoverPause: true,
    nav: false,
    responsive: {
      576: {
        items: 1,
        mergeFit: true,
      },
      768: {
        items: 2,
        mergeFit: true,
      },
      992: {
        items: 3,
        mergeFit: true,
      },
    },
  };

  owlCarousel14Options = {
    items: 1,
    margin: 10,
    autoHeight: true,
    nav: false,
  };
}
