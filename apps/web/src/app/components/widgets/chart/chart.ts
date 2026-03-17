import { Component, ViewEncapsulation } from "@angular/core";

import { NgxChartsModule } from "@swimlane/ngx-charts";
import { ChartistModule } from "ng-chartist";

import * as chartData from "../../../shared/data/widgets-chart/chart-widget";
import {
  dailyDoughnutData,
  monthlyDoughnutData,
} from "../../../shared/data/widgets-chart/chart-widget";

@Component({
  selector: "app-chart",
  imports: [ChartistModule, NgxChartsModule],
  templateUrl: "./chart.html",
  styleUrls: ["./chart.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Chart {
  public isOpened: boolean = true;

  constructor() {
    Object.assign(this, { monthlyDoughnutData, dailyDoughnutData });
  }

  public monthlyDoughnutData = monthlyDoughnutData;
  public dailyDoughnutData = dailyDoughnutData;

  public chart1 = chartData.chart1;
  public chart2 = chartData.chart2;
  public chart3 = chartData.chart3;

  public WidgetBarChart1 = chartData.WidgetBarChart1;
  public WidgetBarChart2 = chartData.WidgetBarChart2;

  public liveProductChart = chartData.liveProductChart;

  public turnOverChart = chartData.turnOverChart;
  public monthlyChart = chartData.monthlyChart;

  public usesChart = chartData.usesChart;
  public financeWidget = chartData.financeWidget;

  public orderStatusWidget = chartData.orderStatusWidget;
  public skillWidget = chartData.skillWidget;

  // Doughnut Chart (Monthly visitor chart)
  public monthlyDoughnutChartColorScheme =
    chartData.monthlyDoughnutChartColorScheme;
  public monthlyDoughnutChartShowLabels =
    chartData.monthlyDoughnutChartShowLabels;
  public monthlyDoughnutChartGradient = chartData.monthlyDoughnutChartGradient;

  // Doughnut Chart (Daily visitor chart)
  public dailyDoughnutChartColorScheme =
    chartData.dailyDoughnutChartColorScheme;
  public dailyDoughnutChartShowLabels = chartData.dailyDoughnutChartShowLabels;
  public dailyDoughnutChartGradient = chartData.dailyDoughnutChartGradient;
}
