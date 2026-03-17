import { CurrencyPipe } from "@angular/common";
import { Component, OnInit, TemplateRef, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { ChangeContext } from "@angular-slider/ngx-slider";
import { NgbModal, NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { CarouselModule } from "ngx-owl-carousel-o";

import {
  IColorFilter,
  IProductColor,
  IProducts,
  IProductTags,
  ITagFilter,
} from "../../../shared/model/e-commerce/product.model";
import { CartService } from "../../../shared/services/e-commerce/cart.service";
import { OrderByPipe } from "../../../shared/services/e-commerce/order-by.pipe";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";
import { WishListService } from "../../../shared/services/e-commerce/wish-list.service";
import { Brand } from "../colection/filter/brand/brand";
import { Color } from "../colection/filter/color/color";
import { Price } from "../colection/filter/price/price";
import { QuickView } from "../quick-view/quick-view";

@Component({
  selector: "app-products",
  imports: [
    Color,
    Brand,
    Price,
    FormsModule,
    NgbModule,
    CarouselModule,
    QuickView,
    RouterModule,
    OrderByPipe,
    CurrencyPipe,
  ],
  templateUrl: "./products.html",
  styleUrls: ["./products.scss"],
})
export class Products implements OnInit {
  productService = inject(ProductsService);
  private cartService = inject(CartService);
  private modalService = inject(NgbModal);
  private wishService = inject(WishListService);

  public productDetail?: IProducts;

  public items: IProducts[] = [];
  public products: IProducts[] = [];
  public colorsFilters: IColorFilter[] = [];
  public colors: IColorFilter[];
  public allItems: IProducts[] = [];
  public tags: ITagFilter[];
  public product: IProductColor[];
  public uniqueColors: IColorFilter[];
  public uniqueProductColor: string;
  public lowPrice: 500;
  public highPrice: 1000;
  public productPrice: number;
  public colorArray: string;
  public sortByOrder: string = "";
  public check: boolean = false;
  public term: string;

  public tagsFilters: IProductTags[] = [];

  public onChangeSorting(val: Event): void {
    const target = val.target as HTMLSelectElement;
    this.sortByOrder = target.value;
  }

  public filterItems(): IProducts[] {
    return this.products.filter((item: IProducts) => {
      const Colors = this.colorsFilters.reduce(
        (prev: boolean, curr: IColorFilter) => {
          const colorValues = item.colors || [];
          return prev && !!curr.color && colorValues.includes(curr.color);
        },
        true,
      );

      const Tags = this.tagsFilters.reduce((prev: boolean, tag) => {
        const itemTags = item.tags || [];
        return prev && itemTags.includes(tag);
      }, true);

      return Colors && Tags;
    });
  }

  public getColors(products: IProducts[]): void {
    var uniqueColors: string[] = [];
    var itemColor = Array();
    products.map((product: IProducts, _index: number) => {
      if (product.colors) {
        product.colors.map((color: string) => {
          const index = uniqueColors.indexOf(color);
          if (index === -1) uniqueColors.push(color);
        });
      }
    });
    for (var i = 0; i < uniqueColors.length; i++) {
      itemColor.push({ color: uniqueColors[i] });
    }
    this.colors = itemColor;
  }

  public updateColor(colors: IColorFilter[]) {
    this.colorsFilters = colors;
  }

  public getTags(products: IProducts[]): void {
    const uniqueBrands: Set<IProductTags> = new Set();

    products.forEach((product) => {
      product.tags?.forEach((tag) => {
        uniqueBrands.add(tag);
      });
    });

    this.tags = Array.from(uniqueBrands).map((tag) => ({ tag }));
  }

  public updateTagFilters(tags: IProductTags[]): void {
    this.tagsFilters = tags;
  }

  public updatePriceFilters(price: ChangeContext): void {
    const priceMin = price.value;
    const maxPrice = price.highValue ?? 1000;

    const items: IProducts[] = [];

    this.productService.getProducts().subscribe((product) => {
      product.forEach((item: IProducts) => {
        if (item.price! >= priceMin && item.price! <= maxPrice) {
          items.push(item);
        }
      });

      this.products = items;
    });
  }

  //image set
  detailCnt = [];
  slidesPerPage = 1;

  customOptions: CarouselModule = {
    slider: 1,
    items: 1,
    margin: 30,
    loop: false,
    pagination: false,
    nav: true,
    dots: false,
    navText: [
      '<i class="fa fa-angle-left"></i>',
      '<i class="fa fa-angle-right"></i>',
    ],
  };

  sidebaron: boolean = false;
  show: boolean = false;
  open: boolean = false;
  public listView: boolean = false;
  public col_xl_12: boolean = false;
  public col_xl_2: boolean = false;

  public col_sm_3: boolean = false;
  public col_xl_3: boolean = true;
  public xl_4: boolean = true;
  public col_sm_4: boolean = false;
  public col_xl_4: boolean = false;
  public col_sm_6: boolean = true;
  public col_xl_6: boolean = false;
  public gridOptions: boolean = true;
  public active: boolean = false;

  openFilter() {
    if (this.show == true && this.sidebaron == true) {
      this.show = false;
      this.sidebaron = false;
    } else {
      this.show = true;
      this.sidebaron = true;
    }
  }
  openMediaFilter() {
    if (this.show == false && this.sidebaron == false && this.open == false) {
      this.show = true;
      this.sidebaron = true;
      this.open = true;
    } else {
      this.show = false;
      this.sidebaron = false;
      this.open = false;
    }
  }

  gridOpen() {
    this.gridOptions = true;
    this.listView = false;
    this.col_xl_3 = true;

    this.xl_4 = true;
    this.col_xl_4 = false;
    this.col_sm_4 = false;

    this.col_xl_6 = false;
    this.col_sm_6 = true;

    this.col_xl_2 = false;
    this.col_xl_12 = false;
  }

  listOpen() {
    this.gridOptions = false;
    this.listView = true;
    this.col_xl_3 = true;
    this.xl_4 = true;
    this.col_xl_12 = true;
    this.col_xl_2 = false;

    this.col_xl_4 = false;
    this.col_sm_4 = false;
    this.col_xl_6 = false;
    this.col_sm_6 = true;
  }

  grid2() {
    this.listView = false;
    this.col_xl_3 = false;
    this.col_sm_3 = false;

    this.col_xl_2 = false;

    this.col_xl_4 = false;
    this.col_sm_4 = false;

    this.col_xl_6 = true;
    this.col_sm_6 = true;

    this.col_xl_12 = false;
  }

  grid3() {
    this.listView = false;
    this.col_xl_3 = false;
    this.col_sm_3 = false;

    this.col_xl_2 = false;
    this.col_xl_4 = true;
    this.col_sm_4 = true;

    this.col_xl_6 = false;
    this.col_sm_6 = false;

    this.col_xl_12 = false;
  }

  grid6() {
    this.listView = false;
    this.col_xl_3 = false;
    this.col_sm_3 = false;

    this.col_xl_2 = true;
    this.col_xl_4 = false;
    this.col_sm_4 = false;

    this.col_xl_6 = false;
    this.col_sm_6 = false;

    this.col_xl_12 = false;
  }

  // add to cart service
  public addToCart(product: IProducts, quantity: number = 1) {
    this.cartService.addToCart(product, quantity);
  }

  //add to wish list service
  public addToWishlist(product: IProducts, quantity: number = 1) {
    this.wishService.addToWishList(product, quantity);
  }

  // open single product detail
  openProductDetail(content: TemplateRef<void>, id: number) {
    this.modalService.open(content, { centered: true, size: "lg" });
    this.productService.getProduct(id).subscribe((product) => {
      this.productDetail = product;
    });
  }

  //decrement product quantity
  public decrement(product: IProducts, quantity: number = -1) {
    this.cartService.updateCartQuantity(product, quantity);
  }

  //increment product quantity
  public increment(product: IProducts, quantity: number = +1) {
    this.cartService.updateCartQuantity(product, quantity);
  }

  ngOnInit() {
    this.productService.getProducts().subscribe((product) => {
      this.products = product;
      this.getColors(product);
      this.getTags(product);
    });
  }
}
