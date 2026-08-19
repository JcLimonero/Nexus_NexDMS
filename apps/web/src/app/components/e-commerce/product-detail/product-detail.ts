import { CurrencyPipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { Image, GalleryModule } from "@ks89/angular-modal-gallery";
import { NgbModule, NgbRatingConfig } from "@ng-bootstrap/ng-bootstrap";

import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import {
  IContentDetailItem,
  IContentDetail,
} from "../../../shared/model/e-commerce/content";
import { IProducts } from "../../../shared/model/e-commerce/product.model";
import { CartService } from "../../../shared/services/e-commerce/cart.service";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";

@Component({
  selector: "app-product-detail",
  imports: [NgbModule, GalleryModule, RouterModule, CurrencyPipe],
  templateUrl: "./product-detail.html",
  styleUrls: ["./product-detail.scss"],
  providers: [NgbRatingConfig],
})
export class ProductDetail implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private config = inject(NgbRatingConfig);
  public productService = inject(ProductsService);
  private cartService = inject(CartService);

  public product: IProducts = {};
  public products: IProducts[] = [];
  public detailCnt: IContentDetailItem[] = [];
  public slidesPerPage = 4;
  public syncedSecondary = true;
  public allContent: IContentDetailItem[] = [];
  public contents: IContentDetailItem[] = [];
  public active = false;
  public type: string = "Febric";
  public nav: string = "";

  public imagesRect: Image[] = [
    new Image(
      0,
      { img: "assets/images/ecommerce/01.jpg" },
      { img: "assets/images/ecommerce/01.jpg" },
    ),
    new Image(
      1,
      { img: "assets/images/ecommerce/04.jpg" },
      { img: "assets/images/ecommerce/04.jpg" },
    ),
    new Image(
      2,
      { img: "assets/images/ecommerce/03.jpg" },
      { img: "assets/images/ecommerce/03.jpg" },
    ),
    new Image(
      3,
      { img: "assets/images/ecommerce/02.jpg" },
      { img: "assets/images/ecommerce/02.jpg" },
    ),
  ];

  constructor() {
    this.allContent = IContentDetail.ContentDetails;

    // Initial filter
    this.contents = this.allContent.filter((opt) => this.type === opt.type);

    // Config for rating
    this.config.max = 5;
    this.config.readonly = false;

    this.route.params.subscribe((params) => {
      const id = +params["id"];
      this.productService.getProduct(id).subscribe((product) => {
        if (product !== undefined) {
          this.product = product;
        } else {
          console.error("Product not found");
        }
      });
    });
  }

  public getOption(type: string): IContentDetailItem[] {
    this.contents = [];
    const matched = this.allContent.filter((data) => {
      if (type === data.type) {
        this.active = true;
        this.contents.push(data);
        return true;
      }
      return false;
    });
    return matched;
  }

  public buyNow(product: IProducts, quantity: number = 1): void {
    if (quantity > 0) {
      this.cartService.addToCart(product, quantity);
      this.router.navigate(["/ecommerce/check-out"]);
    }
  }

  public addToCart(
    product: IProducts,
    quantity: number = 1,
  ): false | ICartItem {
    if (quantity === 0) {
      return false;
    }
    return this.cartService.addToCart(product, quantity);
  }

  ngOnInit(): void {
    this.productService.getProducts().subscribe((productList) => {
      this.products = productList;
      if (productList.length > 0) {
        this.nav = productList[0].img ?? "";
      }
    });
  }
}
