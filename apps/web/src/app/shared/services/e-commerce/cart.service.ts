import { Injectable, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { ToastrService } from "ngx-toastr";
import { BehaviorSubject, Observable, Subscriber, map } from "rxjs";

import { ProductsService } from "./products.service";
import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { IProducts } from "../../../shared/model/e-commerce/product.model";

// Load cart from localStorage
let products: ICartItem[] = JSON.parse(
  localStorage.getItem("cartItem") || "[]",
);

@Injectable({
  providedIn: "root",
})
export class CartService {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductsService);
  private toastrService = inject(ToastrService);

  public cartItems: BehaviorSubject<ICartItem[]> = new BehaviorSubject<
    ICartItem[]
  >(products);
  public observer: Subscriber<{}>;
  private itemsInCart: ICartItem[] = [];
  public itemList: IProducts[] = [];

  constructor() {
    this.cartItems.subscribe((items) => {
      this.itemsInCart = items;
    });
  }

  public getAll(): Observable<ICartItem[]> {
    return new Observable<ICartItem[]>((observer) => {
      observer.next(products);
      observer.complete();
    });
  }

  public addToCart(product: IProducts, quantity: number): ICartItem | false {
    let existingItem = products.find((item) => item.product.id === product.id);

    if (existingItem) {
      const index = products.indexOf(existingItem);
      const newQuantity = existingItem.quantity + quantity;
      const isStockAvailable = this.calculateStockCounts(
        existingItem,
        quantity,
      );

      if (newQuantity !== 0 && isStockAvailable) {
        products[index].quantity = newQuantity;
        this.toastrService.success(
          "This product has been already added to cart.",
        );
        localStorage.setItem("cartItem", JSON.stringify(products));
        this.cartItems.next(products);
      }
      return false;
    }

    const newItem: ICartItem = {
      product,
      quantity,
    };

    products.push(newItem);
    this.toastrService.success("This product has been added to cart.");
    localStorage.setItem("cartItem", JSON.stringify(products));
    this.cartItems.next(products);
    return newItem;
  }

  public calculateStockCounts(item: ICartItem, addedQty: number): boolean {
    const requestedQty = item.quantity + addedQty;
    const availableStock = Number(item.product.stock);

    if (requestedQty > availableStock) {
      this.toastrService.error(
        `You cannot add more than ${availableStock} items in stock.`,
      );
      return false;
    }

    return true;
  }

  public removeCartItem(item: ICartItem): void {
    const index = products.indexOf(item);
    if (index > -1) {
      products.splice(index, 1);
      localStorage.setItem("cartItem", JSON.stringify(products));
      this.cartItems.next(products);
    }
  }

  public updateCartQuantity(
    product: IProducts,
    quantity: number,
  ): ICartItem | false {
    const item = products.find(
      (cartItem) => cartItem.product.id === product.id,
    );

    if (item) {
      const index = products.indexOf(item);
      const updatedQty = item.quantity + quantity;
      const isStockAvailable = this.calculateStockCounts(item, quantity);

      if (updatedQty !== 0 && isStockAvailable) {
        products[index].quantity = updatedQty;
        localStorage.setItem("cartItem", JSON.stringify(products));
        this.cartItems.next(products);
      }

      return item;
    }

    return false;
  }

  public getTotalAmount(): Observable<number> {
    return this.cartItems.pipe(
      map((items: ICartItem[]) => {
        return items.reduce((total, item) => {
          const price = Number(item.product.price);
          return total + price * item.quantity;
        }, 0);
      }),
    );
  }
}
