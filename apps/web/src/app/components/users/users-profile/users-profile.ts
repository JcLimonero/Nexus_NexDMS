import { Component, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "app-users-profile",
  imports: [],
  templateUrl: "./users-profile.html",
  styleUrls: ["./users-profile.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class UsersProfile {
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
