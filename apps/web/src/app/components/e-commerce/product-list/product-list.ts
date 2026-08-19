import { NgClass } from "@angular/common";
import { Component, ViewEncapsulation } from "@angular/core";

import { PRODUCT } from "../../../shared/data/tables/product-list";

@Component({
  selector: "app-product-list",
  imports: [NgClass],
  templateUrl: "./product-list.html",
  styleUrls: ["./product-list.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class ProductList {
  public products = PRODUCT;
}
