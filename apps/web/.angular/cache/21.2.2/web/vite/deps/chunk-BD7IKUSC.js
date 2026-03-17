import {
  NgbConfig
} from "./chunk-DHIRBKSL.js";
import {
  ngbRunTransition
} from "./chunk-ZZDRNYJJ.js";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  Input,
  NgModule,
  Output,
  ViewEncapsulation,
  setClassMetadata,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineNgModule,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef
} from "./chunk-GEELABFK.js";
import {
  EventEmitter,
  NgZone,
  inject,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵresetView,
  ɵɵrestoreView
} from "./chunk-ZDPQBOIA.js";

// node_modules/@ng-bootstrap/ng-bootstrap/fesm2022/ng-bootstrap-ng-bootstrap-alert.mjs
var _c0 = ["*"];
function NgbAlert_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵdomElementStart(0, "button", 1);
    ɵɵdomListener("click", function NgbAlert_Conditional_1_Template_button_click_0_listener() {
      ɵɵrestoreView(_r1);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.close());
    });
    ɵɵdomElementEnd();
  }
}
var NgbAlertConfig = class _NgbAlertConfig {
  constructor() {
    this._ngbConfig = inject(NgbConfig);
    this.dismissible = true;
    this.type = "warning";
  }
  get animation() {
    return this._animation ?? this._ngbConfig.animation;
  }
  set animation(animation) {
    this._animation = animation;
  }
  static {
    this.ɵfac = function NgbAlertConfig_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbAlertConfig)();
    };
  }
  static {
    this.ɵprov = ɵɵdefineInjectable({
      token: _NgbAlertConfig,
      factory: _NgbAlertConfig.ɵfac,
      providedIn: "root"
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbAlertConfig, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();
var ngbAlertFadingTransition = ({
  classList
}) => {
  classList.remove("show");
};
var NgbAlert = class _NgbAlert {
  constructor() {
    this._config = inject(NgbAlertConfig);
    this._elementRef = inject(ElementRef);
    this._zone = inject(NgZone);
    this.animation = this._config.animation;
    this.dismissible = this._config.dismissible;
    this.type = this._config.type;
    this.closed = new EventEmitter();
  }
  /**
   * Triggers alert closing programmatically (same as clicking on the close button (×)).
   *
   * The returned observable will emit and be completed once the closing transition has finished.
   * If the animations are turned off this happens synchronously.
   *
   * Alternatively you could listen or subscribe to the `(closed)` output
   *
   * @since 8.0.0
   */
  close() {
    const transition = ngbRunTransition(this._zone, this._elementRef.nativeElement, ngbAlertFadingTransition, {
      animation: this.animation,
      runningTransition: "continue"
    });
    transition.subscribe(() => this.closed.emit());
    return transition;
  }
  static {
    this.ɵfac = function NgbAlert_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbAlert)();
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _NgbAlert,
      selectors: [["ngb-alert"]],
      hostAttrs: ["role", "alert"],
      hostVars: 6,
      hostBindings: function NgbAlert_HostBindings(rf, ctx) {
        if (rf & 2) {
          ɵɵclassMap("alert show" + (ctx.type ? " alert-" + ctx.type : ""));
          ɵɵclassProp("fade", ctx.animation)("alert-dismissible", ctx.dismissible);
        }
      },
      inputs: {
        animation: "animation",
        dismissible: "dismissible",
        type: "type"
      },
      outputs: {
        closed: "closed"
      },
      exportAs: ["ngbAlert"],
      ngContentSelectors: _c0,
      decls: 2,
      vars: 1,
      consts: () => {
        let i18n_0;
        if (typeof ngI18nClosureMode !== "undefined" && ngI18nClosureMode) {
          const MSG__USERS_JCLIMONERO_DEVELOPER_NEXDMS_NEXUS_NEXDMS_APPS_WEB_NODE_MODULES__NG_BOOTSTRAP_NG_BOOTSTRAP_FESM2022_NG_BOOTSTRAP_NG_BOOTSTRAP_ALERT_MJS_0 = goog.getMsg("Close");
          i18n_0 = MSG__USERS_JCLIMONERO_DEVELOPER_NEXDMS_NEXUS_NEXDMS_APPS_WEB_NODE_MODULES__NG_BOOTSTRAP_NG_BOOTSTRAP_FESM2022_NG_BOOTSTRAP_NG_BOOTSTRAP_ALERT_MJS_0;
        } else {
          i18n_0 = $localize`:@@ngb.alert.close:Close`;
        }
        return [["type", "button", "aria-label", i18n_0, 1, "btn-close"], ["type", "button", "aria-label", i18n_0, 1, "btn-close", 3, "click"]];
      },
      template: function NgbAlert_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵprojectionDef();
          ɵɵprojection(0);
          ɵɵconditionalCreate(1, NgbAlert_Conditional_1_Template, 1, 0, "button", 0);
        }
        if (rf & 2) {
          ɵɵadvance();
          ɵɵconditional(ctx.dismissible ? 1 : -1);
        }
      },
      styles: ["ngb-alert{display:block}\n"],
      encapsulation: 2,
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbAlert, [{
    type: Component,
    args: [{
      selector: "ngb-alert",
      exportAs: "ngbAlert",
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      host: {
        role: "alert",
        "[class]": '"alert show" + (type ? " alert-" + type : "")',
        "[class.fade]": "animation",
        "[class.alert-dismissible]": "dismissible"
      },
      template: `
		<ng-content />
		@if (dismissible) {
			<button
				type="button"
				class="btn-close"
				aria-label="Close"
				i18n-aria-label="@@ngb.alert.close"
				(click)="close()"
			></button>
		}
	`,
      styles: ["ngb-alert{display:block}\n"]
    }]
  }], null, {
    animation: [{
      type: Input
    }],
    dismissible: [{
      type: Input
    }],
    type: [{
      type: Input
    }],
    closed: [{
      type: Output
    }]
  });
})();
var NgbAlertModule = class _NgbAlertModule {
  static {
    this.ɵfac = function NgbAlertModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NgbAlertModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NgbAlertModule,
      imports: [NgbAlert],
      exports: [NgbAlert]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgbAlertModule, [{
    type: NgModule,
    args: [{
      imports: [NgbAlert],
      exports: [NgbAlert]
    }]
  }], null, null);
})();

export {
  NgbAlertConfig,
  NgbAlert,
  NgbAlertModule
};
//# sourceMappingURL=chunk-BD7IKUSC.js.map
