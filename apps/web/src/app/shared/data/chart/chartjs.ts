import { ChartConfiguration, ChartOptions } from "chart.js";

export interface barChartOption {
  scaleShowVerticalLines: boolean;
  responsive: boolean;
}
// barChart
export var barChartOptions: barChartOption = {
  scaleShowVerticalLines: false,
  responsive: true,
};
export var barChartLabels: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
];
export var barChartType: string = "bar";
export var barChartLegend = false;
export interface ChartistSeries {
  data: number[];
  label?: string;
  borderColor?: string;
  backgroundColor?: string;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  tension?: number;
  fill?: boolean;
  borderWidth?: number;
}
export var barChartData: ChartistSeries[] = [
  {
    data: [35, 59, 80, 81, 56, 55, 40],
    label: "Series A",
    backgroundColor: "rgba(102, 204, 255, 0.7)", // Sky Blue
    borderColor: "#66ccff",
    borderWidth: 1,
  },
  {
    data: [28, 48, 40, 19, 86, 27, 90],
    label: "Series B",
    backgroundColor: "rgba(255, 182, 193, 0.7)", // Light Pink
    borderColor: "#ffb6c1",
    borderWidth: 1,
  },
];

export interface BarChartColor {
  backgroundColor: string;
  borderColor?: string;
  borderWidth: number;
  lineTension?: number;
}
export var barChartColors: BarChartColor[] = [
  {
    backgroundColor: "#4466f2",
    borderColor: "rgba(30, 166, 236, 0.8)",
    borderWidth: 1,
  },
  {
    backgroundColor: "#1ea6ec",
    borderColor: "rgba(68, 102, 242, 0.8)",
    borderWidth: 1,
  },
];

// LineGraph Chart
export var lineGraphOptions: ChartOptions<"line"> = {
  responsive: true,
  elements: {
    line: {
      borderWidth: 2,
      fill: false, // no fill under lines
    },
    point: {
      radius: 5,
      backgroundColor: "#fff",
      borderWidth: 2,
      hoverRadius: 6,
      hitRadius: 20,
    },
  },
  plugins: {
    legend: {
      display: false, // already disabled via lineGraphLegend
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
    y: {
      grid: {
        display: true,
        color: "rgba(0, 0, 0, 0.05)",
      },
    },
  },
};

export var lineGraphLabels: string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
];
export var lineGraphType: string = "line";
export var lineGraphLegend = false;
export var lineGraphData: ChartistSeries[] = [
  {
    data: [10, 59, 80, 81, 56, 55, 40],
    label: "Series A",
    borderColor: "#2196F3",
    backgroundColor: "rgba(33,150,243,0.2)",
    pointBackgroundColor: "#2196F3",
    pointBorderColor: "#fff",
    fill: false,
  },
  {
    data: [28, 48, 40, 19, 86, 27, 90],
    label: "Series B",
    borderColor: "#F06292",
    backgroundColor: "rgba(240,98,146,0.2)",
    pointBackgroundColor: "#F06292",
    pointBorderColor: "#fff",
    fill: false,
  },
];
export var lineGraphColors: BarChartColor[] = [
  {
    backgroundColor: "rgba(68, 102, 242, 0.3)",
    borderColor: "#4466f2",
    borderWidth: 2,
  },
  {
    backgroundColor: "rgba(30, 166, 236, 0.3)",
    borderColor: "#1ea6ec",
    borderWidth: 2,
  },
];

// RadarGraph Chart
export const radarGraphOptions: ChartConfiguration<"radar">["options"] = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
    },
  },
  scales: {
    r: {
      angleLines: {
        display: true,
        color: "rgba(0, 0, 0, 0.2)",
      },
      grid: {
        color: "rgba(0, 0, 0, 0.2)",
      },
      ticks: {
        // beginAtZero: true,
      },
    },
  },
};
export var radarGraphLabels: string[] = [
  "Ford",
  "Chevy",
  "Toyota",
  "Honda",
  "Mazda",
];
export var radarGraphType: string = "radar";
export var radarGraphLegend = false;
export var radarGraphData: ChartistSeries[] = [
  {
    data: [12, 3, 5, 18, 7],
    label: "Radar Dataset",
    borderColor: "#3399ff",
    backgroundColor: "rgba(51, 153, 255, 0.2)",
    pointBackgroundColor: "#3399ff",
    pointBorderColor: "#fff",
    fill: true,
  },
];
export var radarGraphColors: BarChartColor[] = [
  {
    backgroundColor: "rgba(68, 102, 242, 0.4)",
    borderWidth: 2,
  },
];

//line chart
export var lineChartData: ChartistSeries[] = [
  {
    data: [10, 20, 40, 30, 0, 20, 10, 30, 10],
    label: "Blue Series",
    borderColor: "#2196F3",
    backgroundColor: "#2196F3",
    pointBackgroundColor: "#2196F3",
    pointBorderColor: "#fff",
    fill: false,
  },
  {
    data: [20, 40, 10, 20, 40, 30, 40, 10, 20],
    label: "Pink Series",
    borderColor: "#E91E63",
    backgroundColor: "#E91E63",
    pointBackgroundColor: "#E91E63",
    pointBorderColor: "#fff",
    fill: false,
  },
  {
    data: [60, 10, 40, 30, 80, 30, 20, 90],
    label: "Orange Series",
    borderColor: "#FF9800",
    backgroundColor: "#FF9800",
    pointBackgroundColor: "#FF9800",
    pointBorderColor: "#fff",
    fill: false,
  },
];
export var lineChartLabels: string[] = [
  "",
  "10",
  "20",
  "30",
  "40",
  "50",
  "60",
  "70",
  "80",
];

export interface LineChart {
  responsive: boolean;
  scaleShowVerticalLines: boolean;
  maintainAspectRatio: boolean;
}

export var lineChartOptions: LineChart = {
  responsive: true,
  scaleShowVerticalLines: false,
  maintainAspectRatio: false,
};
export var lineChartColors: BarChartColor[] = [
  {
    backgroundColor: "rgba(68, 102, 242, 0.3)",
    borderColor: "#4466f2",
    borderWidth: 2,
    lineTension: 0,
  },
  {
    backgroundColor: "rgba(30, 166, 236, 0.3)",
    borderColor: "#1ea6ec",
    borderWidth: 2,
    lineTension: 0,
  },
  {
    backgroundColor: "rgba(68, 102, 242, 0.4)",
    borderColor: "#4466f2",
    borderWidth: 2,
    lineTension: 0,
  },
];
export var lineChartLegend = false;
export var lineChartType: string = "line";
