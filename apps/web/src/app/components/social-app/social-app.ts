import { Component, ViewEncapsulation } from "@angular/core";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { ImageGallery } from "../social-app/image-gallery/image-gallery";

@Component({
  selector: "app-social-app",
  imports: [NgbModule, ImageGallery],
  templateUrl: "./social-app.html",
  styleUrls: ["./social-app.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class SocialApp {
  public active = 1;

  Fileupload: string | ArrayBuffer | null = null;
  public url: string | ArrayBuffer | null = null;

  //FileUpload
  readUrl(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.type.match(/image\/*/)) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.url = reader.result;
    };
  }
}
