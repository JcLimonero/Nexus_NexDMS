import {
  NgbConfig
} from "./chunk-6P2J6VCF.js";
import {
  ngbCollapsingTransition,
  ngbRunTransition
} from "./chunk-PBU6ODNU.js";
import {
  Directive,
  ElementRef,
  EventEmitter,
  Injectable,
  Input,
  NgModule,
  NgZone,
  Output,
  inject,
  setClassMetadata,
  ɵɵclassProp,
  ɵɵdefineDirective,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-WZKIDVDK.js";

// node_modules/@ng-bootstrap/ng-bootstrap/fesm2022/ng-bootstrap-ng-bootstrap-collapse.mjs
var NgbCollapseConfig = class _NgbCollapseConfig {
  constructor() {
    this._ngbConfig = inject(NgbConfig);
    this.horizontal = false;
  }
  get animation() {
    return this._animation ?? this._ngbConfig.animation;
  }
  set animation(animation) {
    this._animation = animation;
  }
  static {
    this.ɵfac = function NgbCollapseConfig_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbCollapseConfig)();
    };
  }
  static {
    this.ɵprov = ɵɵdefineInjectable({
      token: _NgbCollapseConfig,
      factory: _NgbCollapseConfig.ɵfac,
      providedIn: "root"
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbCollapseConfig, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();
var NgbCollapse = class _NgbCollapse {
  constructor() {
    this._config = inject(NgbCollapseConfig);
    this._element = inject(ElementRef);
    this._zone = inject(NgZone);
    this.animation = this._config.animation;
    this._afterInit = false;
    this._isCollapsed = false;
    this.ngbCollapseChange = new EventEmitter();
    this.horizontal = this._config.horizontal;
    this.shown = new EventEmitter();
    this.hidden = new EventEmitter();
  }
  /**
   * If `true`, will collapse the element or show it otherwise.
   */
  set collapsed(isCollapsed) {
    if (this._isCollapsed !== isCollapsed) {
      this._isCollapsed = isCollapsed;
      if (this._afterInit) {
        this._runTransitionWithEvents(isCollapsed, this.animation);
      }
    }
  }
  ngOnInit() {
    this._runTransition(this._isCollapsed, false);
    this._afterInit = true;
  }
  /**
   * Triggers collapsing programmatically.
   *
   * If there is a collapsing transition running already, it will be reversed.
   * If the animations are turned off this happens synchronously.
   *
   * @since 8.0.0
   */
  toggle(open = this._isCollapsed) {
    this.collapsed = !open;
    this.ngbCollapseChange.next(this._isCollapsed);
  }
  _runTransition(collapsed, animation) {
    return ngbRunTransition(this._zone, this._element.nativeElement, ngbCollapsingTransition, {
      animation,
      runningTransition: "stop",
      context: {
        direction: collapsed ? "hide" : "show",
        dimension: this.horizontal ? "width" : "height"
      }
    });
  }
  _runTransitionWithEvents(collapsed, animation) {
    this._runTransition(collapsed, animation).subscribe(() => {
      if (collapsed) {
        this.hidden.emit();
      } else {
        this.shown.emit();
      }
    });
  }
  static {
    this.ɵfac = function NgbCollapse_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbCollapse)();
    };
  }
  static {
    this.ɵdir = ɵɵdefineDirective({
      type: _NgbCollapse,
      selectors: [["", "ngbCollapse", ""]],
      hostVars: 2,
      hostBindings: function NgbCollapse_HostBindings(rf, ctx) {
        if (rf & 2) {
          ɵɵclassProp("collapse-horizontal", ctx.horizontal);
        }
      },
      inputs: {
        animation: "animation",
        collapsed: [0, "ngbCollapse", "collapsed"],
        horizontal: "horizontal"
      },
      outputs: {
        ngbCollapseChange: "ngbCollapseChange",
        shown: "shown",
        hidden: "hidden"
      },
      exportAs: ["ngbCollapse"]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbCollapse, [{
    type: Directive,
    args: [{
      selector: "[ngbCollapse]",
      exportAs: "ngbCollapse",
      host: {
        "[class.collapse-horizontal]": "horizontal"
      }
    }]
  }], null, {
    animation: [{
      type: Input
    }],
    collapsed: [{
      type: Input,
      args: ["ngbCollapse"]
    }],
    ngbCollapseChange: [{
      type: Output
    }],
    horizontal: [{
      type: Input
    }],
    shown: [{
      type: Output
    }],
    hidden: [{
      type: Output
    }]
  });
})();
var NgbCollapseModule = class _NgbCollapseModule {
  static {
    this.ɵfac = function NgbCollapseModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbCollapseModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NgbCollapseModule,
      imports: [NgbCollapse],
      exports: [NgbCollapse]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbCollapseModule, [{
    type: NgModule,
    args: [{
      imports: [NgbCollapse],
      exports: [NgbCollapse]
    }]
  }], null, null);
})();

export {
  NgbCollapseConfig,
  NgbCollapse,
  NgbCollapseModule
};
//# sourceMappingURL=chunk-6TMOMD6V.js.map
