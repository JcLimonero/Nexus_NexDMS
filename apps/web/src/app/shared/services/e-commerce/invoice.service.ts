import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";

import { BehaviorSubject, Subscriber } from "rxjs";

import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import {
  IInvoice,
  ShippingDetails,
} from "../../../shared/model/e-commerce/invoice.model";

@Injectable({
  providedIn: "root",
})
export class InvoiceService {
  private router = inject(Router);

  public invoiceDetails: BehaviorSubject<IInvoice[]> = new BehaviorSubject<
    IInvoice[]
  >([]);
  public observer: Subscriber<{}>;
  public invoice: IInvoice[] = [];

  public OrderDetails!: IInvoice;

  public getOrderItems(): IInvoice {
    return this.OrderDetails;
  }

  public createOrder(
    product: ICartItem[],
    details: ShippingDetails,
    amount: number,
  ): void {
    const item: IInvoice = {
      shippingDetails: details,
      product: product,
      totalAmount: amount,
    };

    this.OrderDetails = item;
    this.router.navigate(["/ecommerce/invoice"]);
  }
}
