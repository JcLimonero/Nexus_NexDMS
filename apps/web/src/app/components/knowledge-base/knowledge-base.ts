import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { FeatherIcons } from "../../shared/components/feather-icons/feather-icons";
import {
  KB_DB,
  KbCategory,
} from "../../shared/data/knowledge-base/knowledge-base";

@Component({
  selector: "app-knowledge-base",
  imports: [FeatherIcons, FormsModule, NgbModule],
  templateUrl: "./knowledge-base.html",
  styleUrls: ["./knowledge-base.scss"],
})
export class KnowledgeBase {
  private _sanitizer = inject(DomSanitizer);

  public Kb: KbCategory[];
  public title: KbCategory;
  public term: string;

  constructor() {
    this.Kb = KB_DB.Kb_Category;
  }
}
