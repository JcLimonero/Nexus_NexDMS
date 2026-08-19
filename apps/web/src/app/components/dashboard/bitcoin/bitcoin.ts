import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { ChartConfiguration, ChartOptions } from "chart.js";
import { ChartistModule } from "ng-chartist";
import { BaseChartDirective } from "ng2-charts";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import * as chartData from "./../../../shared/data/dashboard/crypto";

@Component({
  selector: "app-bitcoin",
  imports: [FeatherIcons, NgbModule, ChartistModule, BaseChartDirective],
  templateUrl: "./bitcoin.html",
  styleUrls: ["./bitcoin.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Bitcoin {
  public isBTC = false;
  public isETH = false;
  public isDASH = false;
  public active1 = 1;

  public chart1 = chartData.chart1;
  public chart2 = chartData.chart2;
  public chart3 = chartData.chart3;
  public chart4 = chartData.chart4;

  public saleChartType = chartData.saleChartType;
  public saleChartLabel = chartData.saleChartLabels;
  public saleChartData = chartData.saleChartData;
  public saleChartOption = chartData.saleChartOptions;
  public saleChartLegend = chartData.saleChartLegend;

  //Invest Chart data and options
  public doughnutChartLabels: string[] = [
    "Download Sales",
    "In-Store Sales",
    "Mail-Order Sales",
  ];
  public doughnutChartDatasets: ChartConfiguration<"doughnut">["data"]["datasets"] =
    [
      {
        data: [40, 8, 10],
        label: "Series A",
        backgroundColor: ["#4466f2", "#f6f6f6", "#1ea6ec"],
      },
    ];

  public doughnutChartOptions: ChartOptions<"doughnut"> = {
    responsive: false,
  };
}
