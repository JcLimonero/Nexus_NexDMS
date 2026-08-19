import { Routes } from "@angular/router";

export const advance: Routes = [
  {
    path: "",
    children: [
      {
        path: "toastr",
        loadComponent: () =>
          import("./ngx-toastr/ngx-toastr").then((m) => m.NgxToastr),
        data: {
          title: "Toastr",
          breadcrumb: "Toastr",
        },
      },
      {
        path: "sweetalert",
        loadComponent: () =>
          import("./sweet-alert/sweet-alert").then((m) => m.SweetAlert),
        data: {
          title: "Sweetalert",
          breadcrumb: "Sweetalert",
        },
      },
      {
        path: "range-slider",
        loadComponent: () =>
          import("./range-slider/range-slider").then((m) => m.RangeSlider),
        data: {
          title: "Range-Slider",
          breadcrumb: "Range-Slider",
        },
      },
      {
        path: "crop",
        loadComponent: () =>
          import("./image-cropper/image-cropper").then((m) => m.ImageCrop),
        data: {
          title: "Cropper",
          breadcrumb: "Cropper",
        },
      },
      {
        path: "sticky",
        loadComponent: () => import("./sticky/sticky").then((m) => m.Sticky),
        data: {
          title: "Sticky",
          breadcrumb: "Sticky",
        },
      },
      {
        path: "owl-carousel",
        loadComponent: () =>
          import("./owl-carousel/owl-carousel").then((m) => m.OwlCarousel),
        data: {
          title: "Owl-Carousel",
          breadcrumb: "Owl-Carousel",
        },
      },
      {
        path: "dropzone",
        loadComponent: () =>
          import("./ngx-dropzone/ngx-dropzone").then((m) => m.NgxDropzone),
        data: {
          title: "Dropzone",
          breadcrumb: "Dropzone",
        },
      },
    ],
  },
];
