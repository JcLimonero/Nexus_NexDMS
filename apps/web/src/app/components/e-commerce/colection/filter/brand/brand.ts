import { Component, input, output, ViewEncapsulation } from "@angular/core";

import { IProductTags } from "../../../../../shared/model/e-commerce/product.model";

@Component({
  selector: "app-brand",
  standalone: true,
  templateUrl: "./brand.html",
  styleUrls: ["./brand.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class Brand {
  readonly tagsFilters = input<{ tag: IProductTags }[]>([]);
  readonly tagFilters = output<IProductTags[]>();

  public checkedTagsArray: IProductTags[] = [];

  checkedFilter(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value as IProductTags;

    const index = this.checkedTagsArray.indexOf(value);
    if (target.checked) {
      if (index === -1) this.checkedTagsArray.push(value);
    } else {
      if (index !== -1) this.checkedTagsArray.splice(index, 1);
    }

    this.tagFilters.emit(this.checkedTagsArray);
  }
}
