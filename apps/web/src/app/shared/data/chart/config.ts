import { Color, ScaleType } from "@swimlane/ngx-charts";
import * as shape from "d3-shape";

//BarChart
// options
export var barChartShowXAxis = true;
export var barChartShowYAxis = true;
export var barChartGradient = true;
export var barChartShowLegend = false;
export var barChartShowXAxisLabel = true;
export var barChartXAxisLabel = "Country";
export var barChartShowYAxisLabel = true;
export var barChartYAxisLabel = "Population";
export var roundEdges: boolean = true;
export var barChartShowGridLines = false;

export const barChartColorScheme: Color = {
  name: "barChartColorScheme",
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ["#007bff", "#ff9f40", "#ff5370", "#1ea6ec"],
};

//Pie-Chart
//Options
export var pieChartShowLabels = true;
export var pieChartGradient = false;

export const pieChartColorScheme: Color = {
  name: "pieColorScheme",
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ["#143fef", "#1ea6ec", "#1a8436", "#0062cc", "#ff850d", "#ff2046"],
};

export var chartOptions = { responsive: true };

//Area Chart
export var areaChartShowXAxis = true;
export var areaChartShowYAxis = true;
export var areaChartGradient = false;
export var areaChartShowXAxisLabel = true;
export var areaChartXAxisLabel = "Country";
export var areaChartShowYAxisLabel = true;
export var areaChartyAxisLabel = "Population";

export const areaChartColorScheme: Color = {
  name: "customScheme",
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ["#007bff", "#ff9f40", "#ff5370"],
};

export var lineChartCurve = shape.curveStep;
export var lineChartCurve1 = shape.curveLinear;
