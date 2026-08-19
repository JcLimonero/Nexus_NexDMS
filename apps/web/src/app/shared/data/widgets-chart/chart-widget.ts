import { Color, ScaleType } from "@swimlane/ngx-charts";
import * as Chartist from "chartist";
import { BarChartConfiguration, LineChartConfiguration } from "ng-chartist";

var primary = localStorage.getItem("primary_color") || "#4466f2";
var secondary = localStorage.getItem("secondary_color") || "#1ea6ec";

//Line Chart
export var chart1: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [25, 50, 30, 40, 60, 80, 50, 10, 50, 13, 0, 10, 30, 40, 10, 15, 20],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 100,
    showPoint: false,
  },
};

export var chart2: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [25, 35, 70, 100, 90, 50, 60, 80, 40, 50, 60, 40, 80, 70, 60, 50, 100],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 100,
    showPoint: false,
  },
};

export var chart3: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [50, 100, 80, 60, 50, 60, 40, 80, 40, 50, 60, 40, 60, 70, 40, 50, 20],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 100,
    showPoint: false,
  },
};

export var WidgetBarChart1: BarChartConfiguration = {
  type: "Bar",
  data: {
    series: [
      [
        80.0, 80.0, 60.0, 20.0, 70.0, 0, 80.0, 60.0, 110.0, 20.0, 60.0, 100, 70,
        30,
      ],
    ],
    labels: [
      80.0, 80.0, 60.0, 20.0, 70.0, 0, 80.0, 60.0, 110.0, 20.0, 60.0, 100, 70,
      30,
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: true,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: true,
      offset: 0,
    },

    chartPadding: {
      bottom: 0,
      top: 0,
      left: 0,
    },
    height: 200,
  },
};

export var WidgetBarChart2: BarChartConfiguration = {
  type: "Bar",
  data: {
    series: [
      [
        60.0, 110.0, 20.0, 60.0, 100.0, 70, 30.0, 80.0, 80.0, 60.0, 20.0, 70, 0,
        80,
      ],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      bottom: 0,
      top: 0,
      left: 0,
    },
    height: 200,
  },
};

export var liveProductChart: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["1", "2", "3", "4", "5", "6"],
    series: [[1, 5, 2, 5, 4, 3, 6]],
  },
  options: {
    low: 0,
    showArea: false,
    showPoint: false,
    fullWidth: true,
    height: 300,
  },
};

export var turnOverChart: BarChartConfiguration = {
  type: "Bar",
  data: {
    labels: ["1", "2", "3", "4", "5", "6"],
    series: [
      [1.9, 4.4, 1.5, 5, 4.4, 3.4],
      [6.4, 5.7, 7, 4, 5.5, 3.5],
      [5, 2.3, 3.6, 6, 3.6, 2.3],
    ],
  },
  options: {
    height: 300,
  },
};

export var monthlyChart: BarChartConfiguration = {
  type: "Bar",
  data: {
    labels: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"],
    series: [
      [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
      [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
      [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
    ],
  },
  options: {
    stackBars: true,
    axisY: {
      labelInterpolationFnc: (value: number): string => {
        return value / 1000 + "k";
      },
    },
    height: 300,
  },
};

export var usesChart: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["1", "2", "3", "4", "5", "6"],
    series: [
      [1, 5, 2, 5, 4, 3],
      [2, 3, 4, 8, 1, 2],
      [5, 4, 3, 2, 1, 0.5],
    ],
  },
  options: {
    low: 0,
    showArea: true,
    showPoint: false,
    fullWidth: true,
    height: 300,
  },
};

export var financeWidget: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [5, 30, 27, 35, 30, 50, 70],
      [0, 5, 10, 7, 25, 20, 30],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 200,
    showPoint: false,
  },
};

export var orderStatusWidget: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [null],
      [40, 15, 25, 20, 15, 20, 10, 25, 35, 13, 35, 10, 30, 20, 10, 15, 20],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 200,
    showPoint: false,
  },
};

export var skillWidget: LineChartConfiguration = {
  type: "Line",
  data: {
    series: [
      [null],
      [null],
      [5, 10, 20, 14, 17, 21, 20, 10, 4, 13, 0, 10, 30, 40, 10, 15, 20],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      low: 0,
      showLabel: false,
      offset: 0,
    },
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
      top: 0,
    },
    lineSmooth: Chartist.Interpolation.cardinal({
      tension: 0,
    }),
    showArea: true,
    fullWidth: true,
    height: 200,
    showPoint: false,
  },
};

export var monthlyDoughnutData = [
  {
    value: 500,
    name: "Safari",
  },
  {
    value: 600,
    name: "Mozila Firefox",
  },
  {
    value: 400,
    name: "Google Crome",
  },
  {
    value: 700,
    name: "Opera Browser",
  },
];

//doughnut-Chart
//Monthly donught chart Options
export var monthlyDoughnutChartShowLabels = false;
export var monthlyDoughnutChartGradient = true;
export var monthlyDoughnutChartColorScheme: Color = {
  domain: [primary, secondary, primary, secondary],
  name: "",
  selectable: false,
  group: ScaleType.Time,
};

export var dailyDoughnutData = [
  {
    value: 448,
    name: "India",
  },
  {
    value: 340,
    name: "USA",
  },
  {
    value: 270,
    name: "Canada",
  },
  {
    value: 359,
    name: "UK",
  },
];
//Monthly donught chart Options
export var dailyDoughnutChartShowLabels = false;
export var dailyDoughnutChartGradient = true;
export var dailyDoughnutChartColorScheme: Color = {
  domain: [primary, secondary, primary, secondary],
  name: "",
  selectable: false,
  group: ScaleType.Time,
};
