import {
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
} from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Observable, of } from "rxjs";

import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { IProducts } from "../../../shared/model/e-commerce/product.model";
import { CartService } from "../../../shared/services/e-commerce/cart.service";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";

@Component({
  selector: "app-quick-view",
  imports: [RouterModule],
  templateUrl: "./quick-view.html",
  styleUrls: ["./quick-view.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class QuickView implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  productService = inject(ProductsService);
  private cartService = inject(CartService);
  private ngb = inject(NgbModal);

  readonly productDetail = input<IProducts>();

  public cartItems: Observable<ICartItem[]> = of([]);
  public selectCartItems: ICartItem[] = [];
  public counter: number = 1;
  public product: IProducts = {};
  public detailCnt = [];
  public slidesPerPage = 4;
  public products: IProducts[];

  public increment() {
    this.counter += 1;
  }

  public decrement() {
    if (this.counter > 1) {
      this.counter -= 1;
    }
  }

  constructor() {
    this.route.params.subscribe((params) => {
      const id = +params["id"];
      this.productService.getProduct(id).subscribe((product) => {
        if (product) {
          this.product = product;
        } else {
          console.warn("Product not found");
        }
      });
    });
  }

  public addToCart(product: IProducts, quantity: string) {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return;
    this.cartService.addToCart(product, qty);
  }

  public buyNow(product: IProducts, quantity: number | string): void {
    const qty =
      typeof quantity === "string" ? parseInt(quantity, 10) : quantity;

    if (qty > 0) {
      this.cartService.addToCart(product, qty);
      this.router.navigate(["/ecommerce/check-out"]);
    }
  }

  ngOnInit() {
    this.cartItems = this.cartService.getAll();
    this.cartItems.subscribe(
      (selectCartItems) => (this.selectCartItems = selectCartItems),
    );
  }
}
