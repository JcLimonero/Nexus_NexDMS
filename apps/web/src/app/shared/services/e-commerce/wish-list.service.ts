import { Injectable, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { ToastrService } from "ngx-toastr";
import { BehaviorSubject, Observable, Subscriber } from "rxjs";

import { ProductsService } from "./products.service";
import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { IProducts } from "../../../shared/model/e-commerce/product.model";

// Strictly type the parsed array from localStorage
let products: ICartItem[] = JSON.parse(
  localStorage.getItem("cartItem") || "[]",
);

@Injectable({
  providedIn: "root",
})
export class WishListService {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductsService);
  private toastrService = inject(ToastrService);

  public wishItems: BehaviorSubject<ICartItem[]> = new BehaviorSubject<
    ICartItem[]
  >([]);
  public observer!: Subscriber<{}>;

  public itemList: IProducts[] = [];

  constructor() {
    this.wishItems.subscribe((_items: ICartItem[]) => {
      // No action required on change
    });
  }

  getAll(): Observable<ICartItem[]> {
    return new Observable<ICartItem[]>((observer) => {
      observer.next(products);
      observer.complete();
    });
  }

  public addToWishList(
    product: IProducts,
    quantity: number,
  ): ICartItem | boolean {
    let existingItem = products.find(
      (item: ICartItem) => item.product.id === product.id,
    );

    if (existingItem) {
      const qty = existingItem.quantity + quantity;
      const isStockAvailable = this.calculateStockCounts(
        existingItem,
        quantity,
      );

      if (qty !== 0 && isStockAvailable) {
        existingItem.quantity = qty;
        this.toastrService.success(
          "This product has been already added to cart.",
        );
        localStorage.setItem("cartItem", JSON.stringify(products));
      }

      return existingItem;
    } else {
      const newItem: ICartItem = { product, quantity };
      products.push(newItem);
      this.toastrService.success("This product has been added to cart.");
      localStorage.setItem("cartItem", JSON.stringify(products));
      return newItem;
    }
  }

  public calculateStockCounts(product: ICartItem, quantity: number): boolean {
    const existingQty = Number(product.quantity);
    const additionalQty = Number(quantity);
    const desiredQty = existingQty + additionalQty;

    const stock = Number(product.product.stock);

    if (stock < desiredQty) {
      this.toastrService.error(
        `You cannot add more items than available. In stock ${stock} items.`,
      );
      return false;
    }
    return true;
  }

  public removeWishItem(item: ICartItem): void {
    if (!item) return;
    const index = products.indexOf(item);
    if (index > -1) {
      products.splice(index, 1);
      localStorage.setItem("cartItem", JSON.stringify(products));
    }
  }
}
