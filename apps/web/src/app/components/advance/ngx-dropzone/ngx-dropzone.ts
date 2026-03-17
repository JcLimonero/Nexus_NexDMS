import { Component, ViewEncapsulation } from "@angular/core";

import { DropzoneConfigInterface, DropzoneModule } from "ngx-dropzone-wrapper";

@Component({
  selector: "app-ngx-dropzone",
  imports: [DropzoneModule],
  templateUrl: "./ngx-dropzone.html",
  styleUrls: ["./ngx-dropzone.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class NgxDropzone {
  public files1: File[] = [];
  public files2: File[] = [];

  public config1: DropzoneConfigInterface = {
    url: "https://httpbin.org/post",
    clickable: true,
    maxFiles: 1,
    addRemoveLinks: true,
    uploadMultiple: false,
    autoReset: null,
    errorReset: null,
    cancelReset: null,
  };

  public config2: DropzoneConfigInterface = {
    url: "https://httpbin.org/post",
    clickable: true,
    uploadMultiple: true,
    autoProcessQueue: false,
    addRemoveLinks: true,
    autoReset: null,
    errorReset: null,
    cancelReset: null,
  };

  public imageConfig: DropzoneConfigInterface = {
    clickable: true,
    url: "https://httpbin.org/post",
    acceptedFiles: "image/*",
    addRemoveLinks: true,
  };

  public config3: DropzoneConfigInterface = {
    clickable: true,
    url: "https://httpbin.org/post",
    autoProcessQueue: false,
    addRemoveLinks: true,
    parallelUploads: 1,
  };

  public onUploadInit(_args: DropzoneConfigInterface): void {}

  public onUploadError(_args: DropzoneConfigInterface): void {}

  public onUploadSuccess(_args: DropzoneConfigInterface): void {}
}
