import { Component, ViewEncapsulation, inject } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { videosData } from "../../shared/data/search-result/search-result";
import { ImageGallery } from "../search-result/image-gallery/image-gallery";

@Component({
  selector: "app-search-result",
  imports: [NgbModule, ImageGallery],
  templateUrl: "./search-result.html",
  styleUrls: ["./search-result.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class SearchResult {
  sanitizer = inject(DomSanitizer);

  public active = 1;
  public videosData = videosData;

  safe(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
