import { Component, OnInit, viewChild } from "@angular/core";

import { LightboxModule } from "ng-gallery/lightbox";
import {
  NgxMasonryComponent,
  NgxMasonryModule,
  NgxMasonryOptions,
} from "ngx-masonry";

export interface IMasonryImage {
  isNew: boolean;
  imageUrl: string;
}

@Component({
  selector: "app-mesonry",
  imports: [LightboxModule, NgxMasonryModule],
  templateUrl: "./mesonry.html",
  styleUrls: ["./mesonry.scss"],
})
export class Mesonry implements OnInit {
  public masonryOptions: NgxMasonryOptions = {
    gutter: 20,
  };

  readonly masonry = viewChild(NgxMasonryComponent);

  public masonryImages: IMasonryImage[] = [];
  limit = 15;

  dummyPictures = [
    { isNew: false, imageUrl: "assets/images/masonry/1.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/2.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/3.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/4.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/5.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/6.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/7.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/8.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/9.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/10.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/11.jpg" },
    { isNew: false, imageUrl: "assets/images/masonry/12.jpg" },
  ];

  ngOnInit() {
    this.masonryImages = this.dummyPictures.slice(0, this.limit);
  }

  showMoreImages() {
    this.limit += 15;
    this.masonryImages = this.dummyPictures.slice(0, this.limit);
  }

  insertImage() {
    this.masonryImages.splice(0, 0, this.dummyPictures[0]);
    this.masonry()?.reloadItems();
    this.masonry()?.layout();
  }
  prependImage() {
    const image = this.dummyPictures[50];
    image.isNew = true;
    this.masonryImages.push(image);
  }

  removeImage() {
    this.masonryImages.pop();
  }

  itemsLoaded() {}
}
