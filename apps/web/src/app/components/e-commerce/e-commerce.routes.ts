import { Routes } from "@angular/router";

export const ecommerce: Routes = [
  {
    path: "",
    children: [
      {
        path: "products",
        loadComponent: () =>
          import("./products/products").then((m) => m.Products),
        pathMatch: "full",
        data: {
          title: "Product",
          breadcrumb: "Product",
        },
      },
      {
        path: "product-details/:id",
        loadComponent: () =>
          import("./product-detail/product-detail").then(
            (m) => m.ProductDetail,
          ),
        data: {
          title: "Product Detail",
          breadcrumb: "Product Detail",
        },
      },
      {
        path: "quick-view/:id",
        loadComponent: () =>
          import("./quick-view/quick-view").then((m) => m.QuickView),
        data: {
          title: "Quick View",
          breadcrumb: "Quick View",
        },
      },
      {
        path: "add-cart",
        loadComponent: () =>
          import("./add-cart/add-cart").then((m) => m.AddCart),
        data: {
          title: "Add To Cart",
          breadcrumb: "Add To Cart",
        },
      },
      {
        path: "wish-list",
        loadComponent: () =>
          import("./wish-list/wish-list").then((m) => m.WishList),
        data: {
          title: "Wish List",
          breadcrumb: "Wish List",
        },
      },
      {
        path: "check-out",
        loadComponent: () =>
          import("./check-out/check-out").then((m) => m.CheckOut),
        data: {
          title: "Check Out",
          breadcrumb: "Check Out",
        },
      },
      {
        path: "invoice",
        loadComponent: () => import("./invoice/invoice").then((m) => m.Invoice),
        data: {
          title: "Invoice",
          breadcrumb: "Invoice",
        },
      },
      {
        path: "payment/detail",
        loadComponent: () =>
          import("./payment-detail/payment-detail").then(
            (m) => m.PaymentDetail,
          ),
        data: {
          title: "Payment Details",
          breadcrumb: "Payment Details",
        },
      },
      {
        path: "order",
        loadComponent: () =>
          import("./order-history/order-history").then((m) => m.OrderHistory),
        data: {
          title: "Order History",
          breadcrumb: "Order History",
        },
      },
      {
        path: "product/list",
        loadComponent: () =>
          import("./product-list/product-list").then((m) => m.ProductList),
        data: {
          title: "product list",
          breadcrumb: "product list",
        },
      },
    ],
  },
];
