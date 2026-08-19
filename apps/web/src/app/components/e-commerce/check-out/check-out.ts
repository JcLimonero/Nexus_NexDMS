import { AsyncPipe, CurrencyPipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { RouterModule } from "@angular/router";

import { Observable, of } from "rxjs";

import { ICartItem } from "../../../shared/model/e-commerce/cart.model";
import { ShippingDetails } from "../../../shared/model/e-commerce/invoice.model";
import { CartService } from "../../../shared/services/e-commerce/cart.service";
import { InvoiceService } from "../../../shared/services/e-commerce/invoice.service";
import { ProductsService } from "../../../shared/services/e-commerce/products.service";

@Component({
  selector: "app-check-out",
  imports: [
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe,
    CurrencyPipe,
  ],
  templateUrl: "./check-out.html",
  styleUrls: ["./check-out.scss"],
})
export class CheckOut implements OnInit {
  private fb = inject(FormBuilder);
  productService = inject(ProductsService);
  private cartService = inject(CartService);
  private invoiceService = inject(InvoiceService);

  public red_border: boolean = false;
  public cartItems: Observable<ICartItem[]> = of([]);
  public checkOutItems: ICartItem[] = [];
  public checkoutForm: FormGroup;
  public amount: number;
  public submitted = false;
  public userInfo!: ShippingDetails;
  constructor() {
    this.createForm();
  }

  createForm() {
    this.checkoutForm = this.fb.group({
      firstName: [
        "",
        [
          Validators.required,
          Validators.pattern("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"),
        ],
      ],
      lastName: [
        "",
        [
          Validators.required,
          Validators.pattern("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"),
        ],
      ],
      phone: ["", [Validators.required, Validators.pattern("[0-9]+")]],
      email: ["", [Validators.required, Validators.email]],
      country: ["", Validators.required],
      address: ["", [Validators.required, Validators.maxLength(50)]],
      town: ["", Validators.required],
      state: ["", Validators.required],
      postalCode: ["", Validators.required],
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.checkoutForm.invalid) {
      this.red_border = true;
      return;
    }
    this.userInfo = this.checkoutForm.value;
    this.invoiceService.createOrder(
      this.checkOutItems,
      this.userInfo,
      this.amount,
    );
  }

  public getTotal(): Observable<number> {
    return this.cartService.getTotalAmount();
  }

  ngOnInit() {
    this.cartItems = this.cartService.getAll();
    this.cartItems.subscribe((products) => (this.checkOutItems = products));
    this.getTotal().subscribe((amount) => (this.amount = amount));
  }
}
