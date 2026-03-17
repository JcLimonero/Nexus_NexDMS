import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { ChartistModule } from "ng-chartist";
import { Ng2GoogleChartsModule } from "ng2-google-charts";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import * as chartData from "../../../shared/data/chart/chartist";
import * as graphOptions from "../../../shared/data/dashboard/project";
import {
  doughnutData,
  vertical_stack_chart,
  multiData,
} from "../../../shared/data/dashboard/project";

@Component({
  selector: "app-project",
  imports: [
    FeatherIcons,
    NgbModule,
    ChartistModule,
    NgxChartsModule,
    Ng2GoogleChartsModule,
  ],
  templateUrl: "./project.html",
  styleUrls: ["./project.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Project {
  public doughnutData = doughnutData;
  public active1 = 1;
  public vertical_stack_chart = vertical_stack_chart;

  public chart7 = chartData.chart7;

  constructor() {
    Object.assign(this, { doughnutData, vertical_stack_chart, multiData });
  }

  // doughnut
  public view: [number, number] = graphOptions.view;
  public doughnutChartColorScheme = graphOptions.doughnutChartcolorScheme;
  public doughnutChartShowLabels = graphOptions.doughnutChartShowLabels;
  public doughnutChartGradient = graphOptions.doughnutChartGradient;

  //vertical_stack_chart
  public verticalStackChartColorScheme = graphOptions.colorScheme;
  public verticalStackChartShowXAxis = graphOptions.showXAxis;
  public verticalStackChartShowYAxis = graphOptions.showYAxis;
  public verticalStackChartGradient = graphOptions.gradient;
  public verticalStackChartShowLegend = graphOptions.showLegend;
  public verticalStackChartShowXAxisLabel = graphOptions.showXAxisLabel;
  public verticalStackChartShowYAxisLabel = graphOptions.showYAxisLabel;

  public chart1 = graphOptions.chart1;
  public chart2 = graphOptions.chart2;
  public chart3 = graphOptions.chart3;
  public chart4 = graphOptions.chart4;
  public chart5 = graphOptions.chart5;
  public chart6 = graphOptions.chart6;

  public pieChart1 = graphOptions.pieChart1;
  public barChartSingle1 = graphOptions.barChartSingle1;
  public barChartSingle2 = graphOptions.barChartSingle2;
  public barChartSingle3 = graphOptions.barChartSingle3;
}
