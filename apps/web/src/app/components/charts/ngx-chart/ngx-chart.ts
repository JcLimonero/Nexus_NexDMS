import { Component } from "@angular/core";

import { NgxChartsModule } from "@swimlane/ngx-charts";

import * as graphOptions from "../../../shared/data/chart/config";
import {
  barChartSingle,
  pieChart,
  multiData,
  single,
} from "../../../shared/data/chart/ngx-chart";

@Component({
  selector: "app-ngx-chart",
  imports: [NgxChartsModule],
  templateUrl: "./ngx-chart.html",
  styleUrls: ["./ngx-chart.scss"],
})
export class NgxChart {
  public barChartSingle = barChartSingle;
  public pieChart = pieChart;
  public multiData = multiData;
  public single = single;

  constructor() {
    Object.assign(this, { multiData, barChartSingle, pieChart, single });
  }

  // Bar-chart options
  public barChartShowYAxis = graphOptions.barChartShowYAxis;
  public barChartShowXAxis = graphOptions.barChartShowXAxis;
  public barChartGradient = graphOptions.barChartGradient;
  public barChartShowLegend = graphOptions.barChartShowLegend;
  public barChartShowXAxisLabel = graphOptions.barChartShowXAxisLabel;
  public barChartXAxisLabel = graphOptions.barChartXAxisLabel;
  public barChartShowYAxisLabel = graphOptions.barChartShowYAxisLabel;
  public barChartYAxisLabel = graphOptions.barChartYAxisLabel;
  public barChartColorScheme = graphOptions.barChartColorScheme;
  public barChartShowGridLines = graphOptions.barChartShowGridLines;

  // pie-chart options
  public pieChartColorScheme = graphOptions.pieChartColorScheme;
  public pieChartShowLabels = graphOptions.pieChartShowLabels;
  public pieChartGradient = graphOptions.pieChartGradient;
  public chartOptions = graphOptions.chartOptions;

  //Area-chart options
  public areaChartShowXAxis = graphOptions.areaChartShowXAxis;
  public areaChartShowYAxis = graphOptions.areaChartShowYAxis;
  public areaChartGradient = graphOptions.areaChartGradient;
  public areaChartShowXAxisLabel = graphOptions.areaChartShowXAxisLabel;
  public areaChartXAxisLabel = graphOptions.areaChartXAxisLabel;
  public areaChartShowYAxisLabel = graphOptions.areaChartShowYAxisLabel;
  public areaChartColorScheme = graphOptions.areaChartColorScheme;
  public lineChartCurve = graphOptions.lineChartCurve;
  public lineChartCurve1 = graphOptions.lineChartCurve1;

  public onSelect(_e: unknown) {}
}
