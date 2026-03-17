import { AsyncPipe, CurrencyPipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { Observable, of } from "rxjs";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { IProducts } from "../../../shared/model/e-commerce/product.model";
import { CartService } from "../../../shared/services/e-commerce/cart.service";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";

@Component({
  selector: "app-add-cart",
  imports: [NgbModule, RouterModule, FeatherIcons, AsyncPipe, CurrencyPipe],
  providers: [ProductsService],
  templateUrl: "./add-cart.html",
  styleUrls: ["./add-cart.scss"],
})
export class AddCart implements OnInit {
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  productsService = inject(ProductsService);

  public cartItems: Observable<ICartItem[]> = of([]);
  public selectCartItems: ICartItem[] = [];
  public quantity: number;

  //remove cart
  public remove(item: ICartItem) {
    this.cartService.removeCartItem(item);
  }

  //get total amount
  public getTotal(): Observable<number> {
    return this.cartService.getTotalAmount();
  }

  //product quantity decrement
  public decrement(product: IProducts, quantity: number = -1) {
    this.cartService.updateCartQuantity(product, quantity);
  }

  //product quantity increment
  public increment(product: IProducts, quantity: number = +1) {
    this.cartService.updateCartQuantity(product, quantity);
  }

  ngOnInit() {
    this.cartItems = this.cartService.getAll();
    this.cartItems.subscribe(
      (selectCartItems) => (this.selectCartItems = selectCartItems),
    );
  }
}
