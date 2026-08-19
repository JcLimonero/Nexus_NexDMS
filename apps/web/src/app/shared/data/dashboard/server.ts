import { Chart, ChartOptions, registerables } from "chart.js";
import streamingPlugin from "chartjs-plugin-streaming";

let streamingRegistered = false;

export function registerStreamingPlugin() {
  if (!streamingRegistered) {
    Chart.register(...registerables, streamingPlugin);
    streamingRegistered = true;
  }
}

var primary = localStorage.getItem("primary_color") || "#4466f2";
var secondary = localStorage.getItem("secondary_color") || "#1ea6ec";

//Sale chart
export var memoryChartType: string = "line";
export var memoryChartLabels: string[] = [
  "1 min.",
  "10 min.",
  "20 min.",
  "30 min.",
  "40 min.",
  "50 min.",
  "60 min.",
  "70 min.",
  "80 min.",
  "90 min.",
  "100 min",
];

export interface ChartistSeries {
  data: number[];
  name?: string;
  className?: string;
  borderColor?: string[];
}
export var memoryChartData: ChartistSeries[] = [
  {
    data: [0, 59, 80, 40, 100, 60, 95, 20, 70, 40, 70],
    borderColor: [primary, secondary, "#22af47"],
  },
  {
    data: [0, 48, 30, 19, 86, 27, 90, 60, 30, 70, 40],
    borderColor: [primary, secondary, "#22af47"],
  },
  {
    data: [0, 30, 40, 10, 60, 40, 70, 30, 20, 80, 50],
    borderColor: [primary, secondary, "#22af47"],
  },
];

export var memoryChartOptions: ChartOptions<"line"> = {
  responsive: true,
  animation: false,
  maintainAspectRatio: false,
  scales: {
    x: {
      display: true,
    },
    y: {
      display: true,
      ticks: {
        precision: 0,
      },
    },
  },
};
export var memoryChartColors = [
  {
    fill: false,
    borderColor: primary,
    borderWidth: 2.5,
    pointBackgroundColor: primary,
    pointBorderColor: primary,
  },
  {
    fill: false,
    borderColor: secondary,
    borderWidth: 2.5,
    pointBackgroundColor: secondary,
    pointBorderColor: secondary,
  },
  {
    fill: false,
    borderColor: "#22af47",
    borderWidth: 2.5,
    pointBackgroundColor: "#22af47",
    pointBorderColor: "#22af47",
  },
];
export var memoryChartLegend = false;

// Line chart
export var latencyChartType = "line";
export var latencyChartLabels: string[] = [
  "",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
];

export const latencyChartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    point: {
      radius: 0,
    },
  },
  scales: {
    x: {
      type: "realtime",
      display: false,
      realtime: {
        duration: 50000,
        refresh: 1000,
        delay: 1000,
        onRefresh: (chart) => {
          chart.data.datasets.forEach((dataset) => {
            const data = dataset.data as { x: number; y: number }[];
            data.push({
              x: Date.now(),
              y: Math.round(Math.random() * 100),
            });
          });
        },
      },
    },
    y: {
      display: false,
      ticks: {
        stepSize: 10,
        precision: 0,
      },
    },
  },
};
export var latencyChartColors = [
  {
    fill: true,
    backgroundColor: "rgb(183, 196, 246)",
    borderColor: "#4466f2",
    borderWidth: 1.5,
    pointBackgroundColor: "#4466f2",
    pointBorderColor: "#4466f2",
    pointBorderWidth: 0,
    lineTension: 0,
  },
];
export var latencyChartLegend = false;

// Line chart
export var cpuChartType: string = "line";
export var cpuChartLabels: string[] = [
  "",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
];
export var cpuChartData = [
  {
    data: [],
  },
  {
    data: [],
  },
];
export var cpuChartOptions = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: "Chart.js",
    },
  },
  scales: {
    x: {
      display: true,
    },
    y: {
      display: true,
    },
  },
};
export var cpuChartColors = [
  {
    fill: true,
    backgroundColor: "rgb(183, 196, 246)",
    borderColor: primary,
    borderWidth: 1.5,
    pointBackgroundColor: primary,
    pointBorderColor: primary,
    pointBorderWidth: 0,
    lineTension: 0,
  },
];

export var cpuChartLegend = false;
