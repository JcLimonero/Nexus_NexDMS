import { ChartConfiguration, ChartOptions } from "chart.js";
import * as Chartist from "chartist";
import type { BarChartOptions, ChartPadding } from "chartist";
import { BarChartConfiguration, LineChartConfiguration } from "ng-chartist";

var primary = localStorage.getItem("primary_color") || "#4466f2";
var secondary = localStorage.getItem("secondary_color") || "#1ea6ec";

// Chart 1
export var chart1: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06"],
    series: [[8, 3, 7.5, 4, 7, 4]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 3,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
      top: 0,
      bottom: 0,
    },
    axisY: {
      low: 0,
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
  },
};

// Chart 2
export var chart2: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06"],
    series: [[8, 3, 7.5, 4, 7, 4]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 3,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
      top: 0,
      bottom: 0,
    },
    axisY: {
      low: 0,
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
  },
};

// Chart 3
export var chart3: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06"],
    series: [[8, 3, 7.5, 4, 7, 4]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 3,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
      top: 0,
      bottom: 0,
    },
    axisY: {
      low: 0,
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
  },
};

// Chart 4
export const chart4: BarChartConfiguration = {
  type: "Bar",
  data: {
    labels: ["100", "200", "300", "400", "500", "600", "700", "800"],
    series: [
      [2.5, 3, 3, 0.9, 1.3, 1.8, 3.8, 1.5],
      [3.8, 1.8, 4.3, 2.3, 3.6, 2.8, 2.8, 2.8],
    ],
  },
  options: {
    seriesBarDistance: 12,
    chartPadding: {
      left: 0,
      right: 0,
      bottom: 0,
    } as ChartPadding,
    axisX: {
      showGrid: false,
      labelInterpolationFnc: (value: string) => value[0],
    },
  } as BarChartOptions,
};

//Sale chart
export var saleChartType: string = "line";
export var saleChartLabels: string[] = [
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016",
];
export const saleChartData: ChartConfiguration<"line">["data"]["datasets"] = [
  {
    data: [1, 2.5, 1.5, 3, 1.3, 2, 4, 4.5],
    borderColor: primary,
    fill: false,
    label: "Series A",
  },
  {
    data: [0, 1, 0.5, 1, 0.3, 1.6, 1.4, 2],
    borderColor: secondary,
    fill: false,
    label: "Series B",
  },
];
export var saleChartOptions: ChartOptions<"line"> = {
  responsive: true,
  animation: false,
  maintainAspectRatio: false,
  scales: {
    x: {
      display: true,
      grid: {
        color: "#fff",
        drawTicks: true,
      },
    },
    y: {
      display: true,
      ticks: {
        precision: 0,
      },
    },
  },
};
export var saleChartLegend = false;
