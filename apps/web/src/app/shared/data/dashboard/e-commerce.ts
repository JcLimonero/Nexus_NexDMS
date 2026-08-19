import { ChartOptions } from "chart.js";

var primary = localStorage.getItem("primary_color") || "#4466f2";

//Sale chart
export var saleChartType: string = "line";
export var saleChartLabels: string[] = [
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
  "2015",
];
export var saleChartData = [
  {
    label: "Sales",
    data: [0, 2.25, 1.25, 3, 1.25, 2.25, 0],
    fill: false, // Set to true to show background area
    backgroundColor: "rgba(115, 102, 255, 0.2)", // Transparent fill
    borderColor: primary,
    borderWidth: 2.5,
    pointBackgroundColor: primary,
    pointBorderColor: primary,
    tension: 0.5,
  },
];
export var saleChartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        color: "#fff",
        drawTicks: true,
      },
      ticks: {
        color: "#666", // optional
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: "#666", // optional
      },
      grid: {
        drawTicks: true,
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

export var saleChartLegend = false;

//Line chart
export var lineChartType1: string = "line";
export var lineChartLabels1: string[] = [
  "",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
];
export var lineChartData1 = [
  {
    label: "Trend",
    data: [20, 33, 20, 50, 20, 33, 20, 0],
    fill: false,
    backgroundColor: "rgba(115, 102, 255, 0.2)",
    borderColor: primary,
    borderWidth: 2.5,
    pointBackgroundColor: primary,
    pointBorderColor: primary,
  },
];
export var lineChartOptions1: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        color: "#fff",
        drawTicks: true,
      },
      ticks: {
        color: "#666",
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        drawTicks: true,
      },
      ticks: {
        color: "#666",
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

export var lineChartLegend1 = false;

//Line chart 2
export var lineChartType2: string = "line";
export var lineChartLabels2: string[] = [
  "",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016",
];
export var lineChartData2 = [
  {
    label: "Sales",
    data: [5, 0, 5, 0, 15, 0, 5, 0, 5],
    fill: false,
    backgroundColor: "rgba(115, 102, 255, 0.2)",
    borderColor: primary,
    borderWidth: 2.5,
    pointBackgroundColor: primary,
    pointBorderWidth: 5,
    pointBorderColor: primary,
    tension: 0,
  },
];
export var lineChartOptions2: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        color: "#fff",
        drawTicks: true,
      },
      ticks: {
        color: "#666", // optional for customizing tick label color
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 5,
        precision: 0,
        color: "#666", // optional
      },
      grid: {
        drawTicks: true,
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

export var lineChartLegend2 = false;

export var staticChartType: string = "line";
export var staticChartLabels: string[] = [
  "0",
  "50",
  "100",
  "150",
  "200",
  "250",
  "300",
  "350",
];
export var staticChartData = [
  {
    label: "Wave",
    data: [
      1.0, 0.64278761, -0.173648178, -0.866025404, -0.939692621, -0.342020143,
      0.5, 0.984807753,
    ],
    fill: false,
    borderColor: primary,
    borderWidth: 2.5,
    pointBackgroundColor: primary,
    pointBorderColor: primary,
    tension: 0.5,
  },
];
export var staticChartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        color: "#fff",
        drawTicks: true,
      },
      ticks: {
        color: "#666",
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: "#666",
      },
      grid: {
        drawTicks: true,
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

export var staticChartLegend = false;
