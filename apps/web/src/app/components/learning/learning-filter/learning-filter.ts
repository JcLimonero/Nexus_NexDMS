import { Component } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { FeatherIcons } from "../../../shared/components/feather-icons/feather-icons";

@Component({
  selector: "app-learning-filter",
  imports: [FeatherIcons, NgbModule],
  templateUrl: "./learning-filter.html",
  styleUrls: ["./learning-filter.scss"],
})
export class LearningFilter {
  public isCourse: boolean = false;
  public isIndustry: boolean = false;
  public isUpcomingCourse: boolean = false;
  public isCategories: boolean;
}
