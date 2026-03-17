import { NgClass } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

import { JobCategory, JobDB } from "../../../shared/data/job-search/job-search";
import { JobFilter } from "../job-filter/job-filter";

@Component({
  selector: "app-job-list",
  imports: [JobFilter, RouterModule, NgClass],
  templateUrl: "./job-list.html",
  styleUrls: ["./job-list.scss"],
})
export class JobList {
  public jobs: JobCategory[];

  constructor() {
    this.jobs = JobDB.Job_Category;
  }
}
