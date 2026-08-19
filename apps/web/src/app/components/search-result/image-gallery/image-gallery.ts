import { Component, OnInit, ViewEncapsulation, inject } from "@angular/core";

import {
  Gallery,
  GalleryItem,
  ImageItem,
  ThumbnailsPosition,
  ImageSize,
  GalleryModule,
} from "ng-gallery";
import { Lightbox, LightboxModule } from "ng-gallery/lightbox";

@Component({
  selector: "app-image-gallery",
  imports: [GalleryModule, LightboxModule],
  templateUrl: "./image-gallery.html",
  styleUrls: ["./image-gallery.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class ImageGallery implements OnInit {
  gallery = inject(Gallery);
  lightbox = inject(Lightbox);

  items: GalleryItem[];

  imageData = data;

  ngOnInit() {
    /** Basic Gallery Example */

    // create gallery items
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
    srcUrl: "assets/images/lightGallery/01.jpg",
    previewUrl: "assets/images/lightGallery/01.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/02.jpg",
    previewUrl: "assets/images/lightGallery/02.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/03.jpg",
    previewUrl: "assets/images/lightGallery/03.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/04.jpg",
    previewUrl: "assets/images/lightGallery/04.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/05.jpg",
    previewUrl: "assets/images/lightGallery/05.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/06.jpg",
    previewUrl: "assets/images/lightGallery/06.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/07.jpg",
    previewUrl: "assets/images/lightGallery/07.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/08.jpg",
    previewUrl: "assets/images/lightGallery/08.jpg",
  },
  {
    srcUrl: "assets/images/lightGallery/09.jpg",
    previewUrl: "assets/images/lightGallery/09.jpg",
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
    srcUrl: "assets/images/lightGallery/012.jpg",
    previewUrl: "assets/images/lightGallery/012.jpg",
  },
];
