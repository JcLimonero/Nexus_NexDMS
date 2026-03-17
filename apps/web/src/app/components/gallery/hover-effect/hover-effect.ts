import { Component, OnInit, ViewEncapsulation, inject } from "@angular/core";

import {
  Gallery,
  GalleryItem,
  ImageItem,
  ImageSize,
  ThumbnailsPosition,
} from "ng-gallery";
import { Lightbox, LightboxModule } from "ng-gallery/lightbox";

@Component({
  selector: "app-hover-effect",
  imports: [LightboxModule],
  templateUrl: "./hover-effect.html",
  styleUrls: ["./hover-effect.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class HoverEffect implements OnInit {
  gallery = inject(Gallery);
  lightbox = inject(Lightbox);

  items: GalleryItem[];

  imageData = data;

  ngOnInit() {
    /** Basic Gallery Example */

    // Creat gallery items
    this.items = this.imageData.map(
      (item) => new ImageItem({ src: item.srcUrl, thumb: item.previewUrl }),
    );

    /** Lightbox Example */

    // Get a lightbox gallery ref
    const lightboxRef = this.gallery.ref("lightbox");

    // Add custom gallery config to the lightbox (optional)
    lightboxRef.setConfig({
      imageSize: ImageSize.Cover,
      thumbPosition: ThumbnailsPosition.Top,
    });

    // Load items into the lightbox gallery ref
    lightboxRef.load(this.items);
  }
}

const data = [
  {
    srcUrl: "assets/images/lightGallery/08.jpg",
    previewUrl: "assets/images/lightGallery/08.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/010.jpg",
    previewUrl: "assets/images/lightGallery/010.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/011.jpg",
    previewUrl: "assets/images/lightGallery/011.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/010.jpg",
    previewUrl: "assets/images/lightGallery/010.jpg",
  },
];
