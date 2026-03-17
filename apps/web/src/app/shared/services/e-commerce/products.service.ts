import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

import { map, Observable } from "rxjs";

import { IProducts } from "../../../shared/model/e-commerce/product.model";

@Injectable({
  providedIn: "root",
})
export class ProductsService {
  private http = inject(HttpClient);
  public currency: string = "USD";

  constructor() {}

  private products(): Observable<IProducts[]> {
    return this.http.get<IProducts[]>("assets/data/ecommerce/products.json");
  }

  public getProducts(): Observable<IProducts[]> {
    return this.products();
  }

  public getProduct(id: number): Observable<IProducts | undefined> {
    return this.products().pipe(
      map((items: IProducts[]) => items.find((item) => item.id === id)),
    );
  }

  public getProductByColor(colorFilters: string[]): Observable<IProducts[]> {
    return this.products().pipe(
      map((items: IProducts[]) =>
        items.filter((item) =>
          item.colors?.some((color: string) => colorFilters.includes(color)),
        ),
      ),
    );
  }

  public checkDuplicateInObject(
    tag: keyof IProducts,
    products: IProducts[],
  ): boolean {
    let seenDuplicate = false;
    const testObject: Record<string, IProducts> = {};

    products.forEach((item) => {
      const itemPropertyName = String(item[tag]);
      if (testObject[itemPropertyName]) {
        // Add `duplicate` field to IProducts using type assertion
        (
          testObject[itemPropertyName] as IProducts & { duplicate?: boolean }
        ).duplicate = true;
        (item as IProducts & { duplicate?: boolean }).duplicate = true;
        seenDuplicate = true;
      } else {
        testObject[itemPropertyName] = item;
        delete (item as IProducts & { duplicate?: boolean }).duplicate;
      }
    });

    return seenDuplicate;
  }

  public getProductByCategory(category: string): Observable<IProducts[]> {
    return this.products().pipe(
      map((items: IProducts[]) =>
        category === "all"
          ? items
          : items.filter((item) => item.category === category),
      ),
    );
  }

  private tag(): Observable<IProducts[]> {
    return this.http.get<IProducts[]>("assets/data/products.json");
  }

  public getTags(): Observable<IProducts[]> {
    return this.products();
  }
}
