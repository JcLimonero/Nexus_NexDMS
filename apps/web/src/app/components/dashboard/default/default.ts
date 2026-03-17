import { Component, ViewEncapsulation } from "@angular/core";

import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  NgApexchartsModule,
} from "ng-apexcharts";
import { ChartistModule } from "ng-chartist";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import * as chartData from "./../../../shared/data/dashboard/default";

export interface RadialBarChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  stroke: ApexStroke;
  colors: string[];
  labels: string[];
}
@Component({
  selector: "app-default",
  imports: [FeatherIcons, ChartistModule, NgApexchartsModule],
  templateUrl: "./default.html",
  styleUrls: ["./default.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Default {
  // Chart Data
  public chart1 = chartData.chartBox1;
  public chart2 = chartData.chartBox2;
  public chart3 = chartData.chartBox3;
  public chart4 = chartData.chartProduction;
  public chart5 = chartData.chartCalculation;

  TotalProfit: RadialBarChartOptions = {
    series: [70],
    chart: {
      height: 350,
      type: "radialBar",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "60%",
        },
      },
    },
    stroke: {
      lineCap: "round",
    },
    colors: ["#4466f2"],
    labels: ["TOTAL PROFIT"],
  };
}
