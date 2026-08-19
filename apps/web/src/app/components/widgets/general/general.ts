import { formatDate, DatePipe } from "@angular/common";
import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  NgbCalendar,
  NgbDateStruct,
  NgbModule,
} from "@ng-bootstrap/ng-bootstrap";
import { CarouselModule } from "ngx-owl-carousel-o";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-general",
  imports: [FeatherIcons, NgbModule, CarouselModule, FormsModule, DatePipe],
  templateUrl: "./general.html",
  styleUrls: ["./general.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class General implements OnInit, OnDestroy {
  private calender = inject(NgbCalendar);

  model: NgbDateStruct;
  date: { year: number; month: number };
  public intMin: ReturnType<typeof setInterval>;
  public intSec: ReturnType<typeof setInterval>;
  public intHour: ReturnType<typeof setInterval>;
  public time: Date = new Date();
  public jsToday = "";
  today: number = Date.now();

  constructor() {
    const calender = this.calender;

    this.model = calender.getToday();
    this.jsToday = formatDate(
      this.time,
      "dd-MM-yyyy hh:mm:ss a",
      "en-US",
      "+0530",
    );
  }

  owlCarousel = [
    {
      desc: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia",
      img: "assets/images/dashboard/boy-2.png",
      name: "Poio klot",
      designation: "Developer",
    },
    {
      desc: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia",
      img: "assets/images/dashboard/boy-2.png",
      name: "Poio klot",
      designation: "Developer",
    },
  ];
  owlCarouselOptions = {
    loop: true,
    margin: 10,
    items: 1,
    nav: false,
    dots: false,
  };

  setTime() {
    this.intMin = setInterval(() => {
      const mins = new Date().getMinutes();
      const mDegree = mins * 6;
      const mRotate = `rotate(${mDegree}deg)`;
      document.getElementById("min")!.style.transform = mRotate;
    }, 1000);

    this.intSec = setInterval(() => {
      const second = new Date().getSeconds();
      const sDegree = second * 6;
      const sRotate = `rotate(${sDegree}deg)`;
      document.getElementById("sec")!.style.transform = sRotate;
    }, 1000);

    this.intHour = setInterval(() => {
      const hour = new Date().getHours();
      const mints = new Date().getMinutes();
      const hDegree = hour * 30 + mints / 2;
      const hRotate = `rotate(${hDegree}deg)`;
      document.getElementById("hour")!.style.transform = hRotate;
    }, 1000);
  }

  ngOnInit() {
    this.setTime();
  }

  ngOnDestroy() {
    if (this.intMin) {
      clearInterval(this.intMin);
    }
    if (this.intSec) {
      clearInterval(this.intSec);
    }
    if (this.intHour) {
      clearInterval(this.intHour);
    }
  }
}
