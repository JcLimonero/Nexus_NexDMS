import { Routes } from "@angular/router";

export const FormContols: Routes = [
  {
    path: "",
    children: [
      {
        path: "validation",
        loadComponent: () =>
          import("./form-validation/form-validation").then(
            (m) => m.FormValidation,
          ),
        data: {
          title: "Validation",
          breadcrumb: "Validation",
        },
      },
      {
        path: "inputs",
        loadComponent: () =>
          import("./base-inputs/base-inputs").then((m) => m.BaseInputs),
        data: {
          title: "Inputs",
          breadcrumb: "Inputs",
        },
      },
      {
        path: "checkbox-radio",
        loadComponent: () =>
          import("./checkbox-radio/checkbox-radio").then(
            (m) => m.CheckboxRadio,
          ),
        data: {
          title: "Checkbox-Radio",
          breadcrumb: "Checkbox-Radio",
        },
      },
      {
        path: "input-groups",
        loadComponent: () =>
          import("./input-groups/input-groups").then((m) => m.InputGroups),
        data: {
          title: "Input-Groups",
          breadcrumb: "Input-Groups",
        },
      },
      {
        path: "mega-options",
        loadComponent: () =>
          import("./mega-options/mega-options").then((m) => m.MegaOptions),
        data: {
          title: "Mega-Options",
          breadcrumb: "Mega-Options",
        },
      },
    ],
  },
];
