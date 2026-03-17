import { Pipe, PipeTransform } from "@angular/core";

import { IProducts } from "../../model/e-commerce/product.model";

@Pipe({
  name: "orderBy",
})
export class OrderByPipe implements PipeTransform {
  transform(array: IProducts[], val: string = "desc"): IProducts[] {
    if (!val?.trim()) return array;

    const arr = [...array];

    switch (val) {
      case "asc":
        return arr.sort((a, b) => this.orderByComparator(a.id ?? 0, b.id ?? 0));
      case "desc":
        return arr.sort((a, b) => this.orderByComparator(b.id ?? 0, a.id ?? 0));
      case "a-z":
        return arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      case "z-a":
        return arr.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
      case "low":
        return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case "high":
        return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      default:
        return array;
    }
  }

  private orderByComparator(a: number | string, b: number | string): number {
    const numA = parseFloat(a as string);
    const numB = parseFloat(b as string);

    const aIsNum = !isNaN(numA) && isFinite(numA);
    const bIsNum = !isNaN(numB) && isFinite(numB);

    if (aIsNum && bIsNum) {
      return numA - numB;
    }

    return a.toString().toLowerCase().localeCompare(b.toString().toLowerCase());
  }
}
