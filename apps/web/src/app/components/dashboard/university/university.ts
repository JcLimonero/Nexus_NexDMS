import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import {
  ApexChart,
  ApexFill,
  ApexGrid,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  NgApexchartsModule,
} from "ng-apexcharts";
import { ChartistModule } from "ng-chartist";
import { BaseChartDirective } from "ng2-charts";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import * as chartData from "./../../../shared/data/dashboard/university";

export interface RadialChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  stroke?: ApexStroke;
  fill?: ApexFill;
  grid?: ApexGrid;
  labels?: string[];
}

@Component({
  selector: "app-university",
  imports: [
    FeatherIcons,
    BaseChartDirective,
    NgApexchartsModule,
    NgbModule,
    ChartistModule,
  ],
  templateUrl: "./university.html",
  styleUrls: ["./university.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class University {
  public chart1 = chartData.chart1;
  public chart2 = chartData.chart2;
  public chart3 = chartData.chart3;
  public chart4 = chartData.chart4;
  public chart5 = chartData.chart5;
  public admissionChartType = chartData.admissionChartType;
  public admissionChartLabels = chartData.admissionChartLabels;
  public admissionChartData = chartData.admissionChartData;
  public admissionChartOptions = chartData.admissionChartOptions;
  public admissionChartColors = chartData.admissionChartColors;
  public admissionChartLegend = chartData.admissionChartLegend;

  public RankerRatio: RadialChartOptions = {
    series: [25],
    chart: {
      type: "radialBar",
      offsetY: -20,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        track: {
          background: "#e7e7e7",
          // strokeWidth: "60%",
          margin: 5, // margin is in pixels
        },
        hollow: {
          margin: 15,
          size: "60%",
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: 64,
            fontSize: "22px",
          },
        },
      },
    },
    grid: {
      padding: {
        top: -10,
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Average Results"],
  };

  TotalProfit: RadialChartOptions = {
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
    labels: ["TOTAL Student"],
  };
}
