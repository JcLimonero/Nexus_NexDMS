import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { JobCategory, JobDB } from "../../../shared/data/job-search/job-search";
import { JobFilter } from "../job-filter/job-filter";

@Component({
  selector: "app-job-desc",
  imports: [JobFilter, RouterModule],
  templateUrl: "./job-desc.html",
  styleUrls: ["./job-desc.scss"],
})
export class JobDesc {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public jobs: JobCategory[];
  public arr: JobCategory;

  constructor() {
    this.jobs = JobDB.Job_Category;
    this.route.params.subscribe((params) => {
      const id = +params["id"];
      this.jobs.filter((items) => {
        if (items.Id === id) {
          this.arr = items;
        }
      });
    });
  }

  applyClick(arr: JobCategory) {
    this.router.navigate(["/job-search/job-apply", arr.Id]);
  }
}
