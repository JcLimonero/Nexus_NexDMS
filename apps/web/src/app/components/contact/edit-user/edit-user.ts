import { Component, OnInit, inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import { ToastrService } from "ngx-toastr";

interface item {
  id: number;
  name: string;
  surname: string;
  mobile: string;
  age: string;
}

@Component({
  selector: "app-edit-user",
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: "./edit-user.html",
  styleUrls: ["./edit-user.scss"],
})
export class EditUser implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  public contactForm: FormGroup;
  public errorMessage: string;
  public url: string;
  public item: item;
  public avatar: unknown;
  public sidebaron: string;

  createForm() {
    this.contactForm = this.fb.group({
      name: [this.item.name, Validators.required],
      surname: [this.item.surname, Validators.required],
      mobile: [this.item.mobile, Validators.required],
      age: [this.item.age, Validators.required],
    });
  }

  save(value: { avatar: unknown; age: number }) {
    value.avatar = this.avatar;
    value.age = Number(value.age);
  }

  showEdit() {
    this.toastr.success("User Updated!");
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
      this.avatar = reader.result;
    };
  }

  cancel() {
    this.router.navigate(["/contact/contacts"]);
  }

  ngOnInit() {
    this.route.data.subscribe((routeData) => {
      let data = routeData["data"];
      if (data) {
        this.avatar = data.payload.data().avatar;
        this.item = data.payload.data();
        this.item.id = data.payload.id;
        this.createForm();
      }
    });
  }
}
