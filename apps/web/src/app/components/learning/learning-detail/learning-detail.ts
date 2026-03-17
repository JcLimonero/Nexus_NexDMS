import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import {
  LearningDB,
  LearningItem,
} from "../../../shared/data/learning/learning";
import { LearningFilter } from "../learning-filter/learning-filter";

@Component({
  selector: "app-learning-detail",
  imports: [LearningFilter],
  templateUrl: "./learning-detail.html",
  styleUrls: ["./learning-detail.scss"],
})
export class LearningDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public courses;
  public arr: LearningItem;

  constructor() {
    this.courses = LearningDB.lang;
    this.route.params.subscribe((params) => {
      const id = +params["id"];
      this.courses.filter((items) => {
        if (items.Id === id) {
          this.arr = items;
        }
      });
    });
  }
}
