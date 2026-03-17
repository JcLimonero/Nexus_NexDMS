import {
  BarChart,
  LineChart,
  PieChart
} from "./chunk-6WJ33TQU.js";
import {
  Component,
  ElementRef,
  Input,
  NgModule,
  Output,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵdefineComponent,
  ɵɵdefineNgModule
} from "./chunk-GEELABFK.js";
import {
  EventEmitter,
  inject,
  ɵɵdefineInjector
} from "./chunk-ZDPQBOIA.js";
import "./chunk-XUDJJ3CF.js";
import "./chunk-U4NN5QIB.js";
import "./chunk-JGB5QRUR.js";
import "./chunk-PNW7LLWN.js";
import "./chunk-TXDUYLVM.js";

// node_modules/ng-chartist/fesm2022/ng-chartist.mjs
var ChartistComponent = class _ChartistComponent {
  elementRef = inject(ElementRef);
  configuration;
  /**
   * Events object where keys are Chartist event names and values are event handler functions.
   *
   * Supported events are: draw, optionsChanged, data, animationBegin, animationEnd, created.
   *
   * Event handler function will receive a data argument which contains event data.
   */
  events;
  /**
   * Event emitted after Chartist chart has been initialized.
   *
   * Event handler function will receive chart instance argument.
   */
  initialized = new EventEmitter();
  chart;
  ngOnInit() {
    if (this.configuration.type && this.configuration.data) {
      this.renderChart();
    }
  }
  ngOnChanges(changes) {
    this.update(changes);
  }
  ngOnDestroy() {
    if (this.chart) {
      this.chart.detach();
      this.chart = null;
    }
  }
  renderChart() {
    const nativeElement = this.elementRef.nativeElement;
    const {
      type,
      data,
      options,
      responsiveOptions
    } = this.configuration;
    if (type === "Bar") {
      this.chart = new BarChart(nativeElement, data, options, responsiveOptions);
    } else if (type === "Line") {
      this.chart = new LineChart(nativeElement, data, options, responsiveOptions);
    } else if (type === "Pie") {
      this.chart = new PieChart(nativeElement, data, options, responsiveOptions);
    } else {
      throw new Error(`${type} is not a known chart type`);
    }
    if (this.events) {
      this.bindEvents();
    }
    this.initialized.emit(this.chart);
  }
  update(changes) {
    const {
      type,
      data,
      options
    } = this.configuration;
    if (!type || !data) {
      return;
    }
    const changedConfiguration = changes.configuration.currentValue;
    if (!this.chart || changedConfiguration.type !== type) {
      this.renderChart();
    } else if ("data" in changedConfiguration || "options" in changedConfiguration) {
      this.chart.update(data, options);
    }
  }
  bindEvents() {
    for (const event of Object.keys(this.events)) {
      this.chart.on(event, this.events[event]);
    }
  }
  static ɵfac = function ChartistComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChartistComponent)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _ChartistComponent,
    selectors: [["x-chartist"]],
    inputs: {
      configuration: "configuration",
      events: "events"
    },
    outputs: {
      initialized: "initialized"
    },
    features: [ɵɵNgOnChangesFeature],
    decls: 0,
    vars: 0,
    template: function ChartistComponent_Template(rf, ctx) {
    },
    styles: ["[_nghost-%COMP%]{display:block}"]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChartistComponent, [{
    type: Component,
    args: [{
      selector: "x-chartist",
      template: "",
      styles: [":host{display:block}\n"]
    }]
  }], null, {
    configuration: [{
      type: Input
    }],
    events: [{
      type: Input
    }],
    initialized: [{
      type: Output
    }]
  });
})();
var ChartistModule = class _ChartistModule {
  static ɵfac = function ChartistModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ChartistModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _ChartistModule,
    imports: [ChartistComponent],
    exports: [ChartistComponent]
  });
  static ɵinj = ɵɵdefineInjector({});
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChartistModule, [{
    type: NgModule,
    args: [{
      imports: [ChartistComponent],
      exports: [ChartistComponent]
    }]
  }], null, null);
})();
export {
  ChartistComponent,
  ChartistModule
};
//# sourceMappingURL=ng-chartist.js.map
