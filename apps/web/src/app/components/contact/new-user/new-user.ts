import { Component, ViewEncapsulation, inject } from "@angular/core";
import {
  FormBuilder,
  Validators,
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { Router } from "@angular/router";

import { ToastrService } from "ngx-toastr";

type UserFields = "name" | "surname" | "mobile" | "profileImg" | "age";
type FormErrors = { [u in UserFields]: string };
@Component({
  selector: "app-new-user",
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: "./new-user.html",
  styleUrls: ["./new-user.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class NewUser {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  public contactForm: FormGroup;
  public sidebaron: string;
  public formErrors: FormErrors = {
    name: "",
    surname: "",
    mobile: "",
    profileImg: "",
    age: "",
  };
  public errorMessage: string;
  public url: string | ArrayBuffer | null = null;
  public avatarLink: unknown;

  constructor() {
    this.contactForm = new FormGroup({
      name: new FormControl(),
      surname: new FormControl(),
      mobile: new FormControl(),
      age: new FormControl(),
    });
  }

  resetFields() {
    this.contactForm = this.fb.group({
      name: new FormControl("", Validators.required),
      surname: new FormControl("", Validators.required),
      mobile: new FormControl("", Validators.required),
      age: new FormControl("", Validators.required),
    });
  }
  showSuccess() {
    this.toastr.success("User Created!");
  }

  //FileUpload
  readUrl(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file: File = input.files[0];

    // Image upload validation
    const mimeType: string = file.type;
    if (!mimeType.startsWith("image/")) return;

    // Image upload
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.url = reader.result;
    };
  }

  cancel() {
    this.router.navigate(["/contact/contacts"]);
  }

  submit() {
    this.router.navigate(["/contact/contacts"]);
  }
}
