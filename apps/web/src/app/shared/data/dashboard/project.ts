import { Color, ScaleType } from "@swimlane/ngx-charts";
import * as Chartist from "chartist";
import type { BarChartOptions, BarChartData } from "chartist";
import { LineChartConfiguration } from "ng-chartist";
import { GoogleChartInterface } from "ng2-google-charts";

var primary = localStorage.getItem("primary_color") || "#4466f2";
var secondary = localStorage.getItem("secondary_color") || "#1ea6ec";

export interface IMultiSeries {
  name: string;
  value: number;
}

export interface IMultiData {
  name: string;
  series: IMultiSeries[];
}

export const doughnutData: { name: string; value: number }[] = [
  {
    value: 300,
    name: "Frontend",
  },
  {
    value: 50,
    name: "Backend",
  },
  {
    value: 30,
    name: "Api",
  },
  {
    value: 100,
    name: "Issues",
  },
];

//doughnut-Chart
export var view: [number, number] = [285, 285];

//Options
export var doughnutChartShowLabels = false;
export var doughnutChartGradient = true;
export var doughnutChartcolorScheme: Color = {
  domain: [primary, secondary, secondary, secondary],
  name: "",
  selectable: false,
  group: ScaleType.Time,
};

export var multiData: IMultiData[] = [
  {
    name: "Mon",
    series: [
      {
        name: "y",
        value: 3,
      },
      {
        name: "z",
        value: 2,
      },
    ],
  },
  {
    name: "Tue",
    series: [
      {
        name: "y",
        value: 3,
      },
      {
        name: "z",
        value: 0,
      },
    ],
  },
  {
    name: "Wen",
    series: [
      {
        name: "y",
        value: 0,
      },
      {
        name: "z",
        value: 1.5,
      },
    ],
  },
  {
    name: "Thu",
    series: [
      {
        name: "y",
        value: 2,
      },
      {
        name: "z",
        value: 0,
      },
    ],
  },
  {
    name: "Fri",
    series: [
      {
        name: "y",
        value: 0,
      },
      {
        name: "z",
        value: 3.5,
      },
    ],
  },
  {
    name: "Sat",
    series: [
      {
        name: "y",
        value: 3,
      },
      {
        name: "z",
        value: 2,
      },
    ],
  },
  {
    name: "sun",
    series: [
      {
        name: "y",
        value: 0,
      },
      {
        name: "z",
        value: 2,
      },
    ],
  },
];
//vertical-stack chart
export var vertical_stack_chart = [
  {
    x: "Mon",
    y: 3,
    z: 2,
  },
  {
    x: "Tue",
    y: 3,
    z: null,
  },
  {
    x: "Wed",
    y: 0,
    z: 1.5,
  },
  {
    x: "Thu",
    y: 2,
    z: null,
  },
  {
    x: "Fri",
    y: 0,
    z: 3.5,
  },
  {
    x: "Sat",
    y: 3,
    z: 2,
  },
  {
    x: "Sun",
    y: 0,
    z: 2,
  },
];

//Vertical stacked chart option
export var showXAxis: boolean = true;
export var showYAxis: boolean = true;
export var gradient: boolean = false;
export var showLegend: boolean = false;
export var showXAxisLabel: boolean = true;
export var showYAxisLabel: boolean = true;

export var colorScheme = {
  domain: [primary, secondary, primary, secondary],
};

export var chart1: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06"],
    series: [[1, 5, 2, 5, 4, 3]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 2,
    }),
    showArea: true,
    showPoint: false,
    fullWidth: true,

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

export var chart2: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    series: [[5, 2, 3, 1, 3, 2]],
  },
  options: {
    showArea: true,
    showPoint: false,
    fullWidth: true,
    axisX: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
    axisY: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
  },
};

export var chart3: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    series: [[1, 2, 5, 1, 4, 3]],
  },
  options: {
    low: 0,
    showArea: true,
    showPoint: false,
    fullWidth: true,
    axisX: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
    axisY: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
  },
};

export var chart4: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    series: [[1, 2, 4, 3, 2, 3]],
  },
  options: {
    low: 0,
    showArea: true,
    showPoint: false,
    fullWidth: true,

    axisX: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
    axisY: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
  },
};

export var chart5: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    series: [[0, 5, 2, 3, 1, 3]],
  },
  options: {
    low: 0,
    showArea: true,
    showPoint: false,
    fullWidth: true,

    axisX: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
    axisY: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
  },
};

export var chart6: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    series: [[1, 2, 3, 1, 2, 3]],
  },
  options: {
    low: 0,
    showArea: true,
    showPoint: false,
    fullWidth: true,

    axisX: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
    axisY: {
      low: 0,
      offset: -5,
      showLabel: false,
      showGrid: false,
    },
  },
};

export var pieChart1: GoogleChartInterface = {
  chartType: "PieChart",
  dataTable: [
    ["Week", "Day in week"],
    ["Mon", 15],
    ["Tue", 10],
    ["Wed", 15],
    ["Thu", 20],
    ["Fri", 25],
    ["sat", 20],
    ["Sun", 10],
  ],
  options: {
    title: "My Daily Activities",
    height: 400,
    width: 693,
    colors: [
      primary,
      secondary,
      "#22af47",
      "#007bff",
      "#FF5370",
      "#22af47",
      "#ff9f40",
    ],
    labels: false,
    backgroundColor: "transparent",
  },
};

export var barChartSingle1: BarChartConfig = {
  type: "Bar",
  data: {
    series: [
      [5, 7, 3, 5, 2, 3, 9, 6, 5, 9],
      [5, 3, 5, 2, 5, 3, 3, 9, 6, 5],
      [9, 2, 9, 6, 5, 9, 7, 3, 5, 2],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      offset: 0,
    },
    height: 70,
    width: 450,
  },
};

export interface BarChartConfig {
  type: "Bar";
  data: BarChartData;
  options?: BarChartOptions;
}

export var barChartSingle2: BarChartConfig = {
  type: "Bar",
  data: {
    series: [
      [5, 7, 3, 5, 2, 3, 9, 6, 5, 9],
      [5, 3, 5, 2, 5, 3, 3, 9, 6, 5],
      [9, 7, 9, 6, 5, 9, 7, 3, 5, 2],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      offset: 0,
    },
    height: 70,
    width: 450,
  },
};
export var barChartSingle3: BarChartConfig = {
  type: "Bar",
  data: {
    series: [
      [9, 7, 3, 5, 2, 5, 3, 5, 3, 9],
      [6, 5, 9, 3, 5, 2, 5, 3, 6, 5],
      [9, 7, 9, 2, 5, 3, 7, 9, 5, 6],
    ],
  },
  options: {
    axisX: {
      showGrid: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      offset: 0,
    },
    height: 70,
    width: 450,
  },
};
