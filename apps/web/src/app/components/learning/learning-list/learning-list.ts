import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import {
  LearningDB,
  LearningItem,
} from "../../../shared/data/learning/learning";
import { LearningFilter } from "../learning-filter/learning-filter";

@Component({
  selector: "app-learning-list",
  imports: [LearningFilter],
  templateUrl: "./learning-list.html",
  styleUrls: ["./learning-list.scss"],
})
export class LearningList {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public courses: LearningItem[] = [];

  constructor() {
    this.courses = LearningDB.lang;
  }

  detailView(course: LearningItem) {
    this.router.navigate(["/learning/learning-detail", course.Id]);
  }
}
