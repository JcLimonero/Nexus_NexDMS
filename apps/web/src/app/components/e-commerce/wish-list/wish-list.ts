import { CurrencyPipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { Observable, of } from "rxjs";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";
import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";
import { WishListService } from "../../../shared/services/e-commerce/wish-list.service";

@Component({
  selector: "app-wish-list",
  imports: [RouterModule, FeatherIcons, CurrencyPipe],
  templateUrl: "./wish-list.html",
  styleUrls: ["./wish-list.scss"],
})
export class WishList implements OnInit {
  private route = inject(ActivatedRoute);
  private wishService = inject(WishListService);
  productsService = inject(ProductsService);

  public cartItems: Observable<ICartItem[]> = of([]);
  public selectCartItems: ICartItem[] = [];

  remove(item: ICartItem) {
    this.wishService.removeWishItem(item);
  }

  ngOnInit() {
    this.cartItems = this.wishService.getAll();
    this.cartItems.subscribe(
      (selectCartItems) => (this.selectCartItems = selectCartItems),
    );
  }
}
