import * as Chartist from "chartist";
import { LineChartConfiguration } from "ng-chartist";

// Chart 1
export var chartBox1: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06", "07"],
    series: [[0, 2, 1.2, 4, 2, 3, 1.5, 0]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 2,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
      bottom: 0,
    },
    // colors: [primary],
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
export var chartBox2: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06"],
    series: [[0, 2, 1.2, 4, 2, 3, 0]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 2,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
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
export var chartBox3: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06", "07"],
    series: [[0, 2, 1.2, 4, 2, 3, 1.5, 2, 0]],
  },
  options: {
    lineSmooth: Chartist.Interpolation.simple({
      divisor: 2,
    }),
    fullWidth: !0,
    showArea: !0,
    chartPadding: {
      right: 0,
      left: 0,
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
export var chartCalculation: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["01", "02", "03", "04", "05", "06", "07", "08"],
    series: [
      [0, 2, 1.2, 4, 2, 3, 1.5, 0],
      [0, 1, 2.2, 1.5, 3, 1.5, 2.25, 0],
    ],
  },
  options: {
    low: 0,
    showArea: true,
    fullWidth: true,
    chartPadding: {
      left: 0,
      right: 0,
    },
    axisY: {
      low: 0,
      scaleMinSpace: 50,
    },
    axisX: {
      showGrid: false,
    },
  },
};

// Chart 5
export var chartProduction: LineChartConfiguration = {
  type: "Line",
  data: {
    labels: ["2009", "2010", "2011", "2012"],
    series: [
      [0, 6, 2, 6],
      [0, 7, 1, 8],
    ],
  },
  options: {
    fullWidth: true,
    chartPadding: {
      right: 40,
    },
  },
};
