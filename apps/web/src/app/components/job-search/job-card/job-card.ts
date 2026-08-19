import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

import { JobCategory, JobDB } from "../../../shared/data/job-search/job-search";
import { JobFilter } from "../job-filter/job-filter";

@Component({
  selector: "app-job-card",
  imports: [JobFilter, RouterModule],
  templateUrl: "./job-card.html",
  styleUrls: ["./job-card.scss"],
})
export class JobCard {
  public jobs: JobCategory[];

  constructor() {
    this.jobs = JobDB.Job_Category;
  }
}
