import { NgClass } from "@angular/common";
import { Component, input, output } from "@angular/core";

import {
  IColorFilter,
  IProducts,
} from "../../../../../shared/model/e-commerce/product.model";

@Component({
  selector: "app-color",
  imports: [NgClass],
  templateUrl: "./color.html",
  styleUrls: ["./color.scss"],
})
export class Color {
  public activeItem: string | undefined = "";
  readonly colorsFilters = input<IColorFilter[]>([]);
  readonly colorFilters = output<IColorFilter[]>();
  public product: IProducts;
  readonly uniqueProductColor = input<string[]>();
  // Click to call function
  public changeColor(colors: IColorFilter): void {
    this.activeItem = colors.color;
    if (colors.color) {
      this.colorFilters.emit([colors]);
    } else {
      this.colorFilters.emit([]);
    }
  }
}
