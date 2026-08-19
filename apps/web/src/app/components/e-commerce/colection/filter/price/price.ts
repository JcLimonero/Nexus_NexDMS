import { Component, output } from "@angular/core";

import {
  ChangeContext,
  LabelType,
  NgxSliderModule,
  Options,
  PointerType,
} from "@angular-slider/ngx-slider";

@Component({
  selector: "app-price",
  imports: [NgxSliderModule],
  templateUrl: "./price.html",
  styleUrls: ["./price.scss"],
})
export class Price {
  readonly priceFilters = output<ChangeContext>();

  minValue: number = 100;
  maxValue: number = 1000;
  options: Options = {
    floor: 100,
    ceil: 1000,

    translate: (value: number, label: LabelType): string => {
      switch (label) {
        case LabelType.Low:
          return "$" + value;
        case LabelType.High:
          return "$" + value;
        default:
          return "$" + value;
      }
    },
  };
  public logText: string = "";
  public min: number;
  public max: number;

  onUserChangeStart(changeContext: ChangeContext): void {
    this.logText += `onUserChangeStart(${this.getChangeContextString(changeContext)})\n`;
  }

  onUserChange(changeContext: ChangeContext): void {
    this.logText += `onUserChange(${this.getChangeContextString(changeContext)})\n`;
  }

  onUserChangeEnd(changeContext: ChangeContext): void {
    this.logText += `onUserChangeEnd(${this.getChangeContextString(changeContext)})\n`;
  }

  getChangeContextString(changeContext: ChangeContext): string {
    this.min = changeContext.value;
    this.max = Number(changeContext.highValue);
    this.priceFilters.emit(changeContext);
    return (
      `{pointerType: ${changeContext.pointerType === PointerType.Min ? "Min" : "Max"}, ` +
      `value: ${changeContext.value}, ` +
      `highValue: ${changeContext.highValue}}`
    );
  }

  constructor() {}
}
