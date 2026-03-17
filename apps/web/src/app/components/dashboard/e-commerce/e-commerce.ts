import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  NgApexchartsModule,
} from "ng-apexcharts";
import { BaseChartDirective } from "ng2-charts";
import { CarouselModule } from "ngx-owl-carousel-o";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import * as data from "./../../../shared/data/dashboard/e-commerce";

export interface RadialBarChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  stroke?: ApexStroke;
  fill?: ApexFill;
  dataLabels?: ApexDataLabels;
  colors?: string[];
  labels?: string[];
}

@Component({
  selector: "app-e-commerce",
  imports: [
    FeatherIcons,
    NgbModule,
    BaseChartDirective,
    CarouselModule,
    NgApexchartsModule,
  ],
  templateUrl: "./e-commerce.html",
  styleUrls: ["./e-commerce.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class ECommerce {
  public slidesStore = [
    {
      id: 1,
      icon: "dollar-sign",
      title: "Total Earning",
      number: 72,
    },
    {
      id: 2,
      icon: "map-pin",
      title: "Total Web Visitor",
      number: 65,
    },
    {
      id: 3,
      icon: "shopping-cart",
      title: "Total Sale Product",
      number: 96,
    },
    {
      id: 4,
      icon: "trending-down",
      title: "Company Loss",
      number: 89,
    },
    {
      id: 5,
      icon: "dollar-sign",
      title: "Total Earning",
      number: 72,
    },
  ];

  public customOptions: CarouselModule = {
    margin: 10,
    autoplay: true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    loop: true,
    dots: false,
    nav: false,
    responsiveClass: true,
    responsive: {
      0: {
        items: 1,
        nav: false,
      },
      420: {
        items: 2,
        nav: false,
      },
      600: {
        items: 3,
        nav: false,
      },
      932: {
        items: 4,
        nav: false,
      },
    },
  };

  // Charts1
  public saleChartType = data.saleChartType;
  public saleChartLabel = data.saleChartLabels;
  public saleChartData = data.saleChartData;
  public saleChartOption = data.saleChartOptions;
  public saleChartLegend = data.saleChartLegend;

  // Charts1
  public chartType1 = data.lineChartType1;
  public chartLabel1 = data.lineChartLabels1;
  public chartData1 = data.lineChartData1;
  public chartOption1 = data.lineChartOptions1;
  public chartLegend1 = data.lineChartLegend1;

  // Chart2
  public chartType2 = data.lineChartType2;
  public chartLabel2 = data.lineChartLabels2;
  public chartData2 = data.lineChartData2;
  public chartOption2 = data.lineChartOptions2;
  public chartLegend2 = data.lineChartLegend2;

  //Static chart
  public staticChartType = data.staticChartType;
  public staticChartLabel = data.staticChartLabels;
  public staticChartData = data.staticChartData;
  public staticChartOption = data.staticChartOptions;
  public staticChartLegend = data.staticChartLegend;

  public TotalReview: RadialBarChartOptions = {
    series: [35],
    chart: {
      height: 320,
      type: "radialBar",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "80%",
        },
      },
    },
    colors: ["#4466F2"],
    labels: ["REVIEW"],
  };

  public Totalreview: RadialBarChartOptions = {
    series: [85],
    chart: {
      height: 300,
      type: "radialBar",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "80%",
        },
        track: {
          background: "#4466F2",
        },
      },
    },
    stroke: {
      lineCap: "round",
    },
    fill: {
      colors: ["#fff"],
    },
    labels: ["REVIEW"],
  };
}
