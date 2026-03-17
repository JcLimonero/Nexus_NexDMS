import { Routes } from "@angular/router";

export const jobsearch: Routes = [
  {
    path: "",
    children: [
      {
        path: "cardview",
        loadComponent: () =>
          import("./job-card/job-card").then((m) => m.JobCard),
        data: {
          title: "Card View",
          breadcrumb: "Card View",
        },
      },
      {
        path: "listview",
        loadComponent: () =>
          import("./job-list/job-list").then((m) => m.JobList),
        data: {
          title: "List View",
          breadcrumb: "List View",
        },
      },
      {
        path: "job-desc/:id",
        loadComponent: () =>
          import("./job-desc/job-desc").then((m) => m.JobDesc),
        data: {
          title: "Job Details",
          breadcrumb: "Job Details",
        },
      },
      {
        path: "job-apply/:id",
        loadComponent: () =>
          import("./job-apply/job-apply").then((m) => m.JobApply),
        data: {
          title: "Apply",
          breadcrumb: "Apply",
        },
      },
    ],
  },
];
