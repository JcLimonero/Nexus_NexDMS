import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, ElementRef, inject } from "@angular/core";
import { RouterModule } from "@angular/router";

import { NgxPrintModule } from "ngx-print";

import { IInvoice } from "../../../shared/model/e-commerce/invoice.model";
import { InvoiceService } from "../../../shared/services/e-commerce/invoice.service";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";

@Component({
  selector: "app-invoice",
  imports: [NgxPrintModule, RouterModule, CurrencyPipe, DatePipe],
  templateUrl: "./invoice.html",
  styleUrls: ["./invoice.scss"],
})
export class Invoice {
  private invoiceService = inject(InvoiceService);
  private elRef = inject(ElementRef);
  productsService = inject(ProductsService);

  public date: Date = new Date();
  public orderDetails!: IInvoice;

  ngOnInit() {
    this.orderDetails = this.invoiceService.getOrderItems();
  }
}
