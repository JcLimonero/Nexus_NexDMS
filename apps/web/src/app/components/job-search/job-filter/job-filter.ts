import { Component } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-job-filter",
  imports: [NgbModule, FeatherIcons],
  templateUrl: "./job-filter.html",
  styleUrls: ["./job-filter.scss"],
})
export class JobFilter {
  public isFilter: boolean = false;
  public isLocation: boolean = false;
  public isJob_Title: boolean = false;
  public isIndustry: boolean = false;
  public isSpecific_skills: boolean = false;
}
