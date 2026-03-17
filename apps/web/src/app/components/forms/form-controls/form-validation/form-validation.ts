import { Component, OnInit, inject } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";

@Component({
  selector: "app-form-validation",
  imports: [],
  templateUrl: "./form-validation.html",
  styleUrls: ["./form-validation.scss"],
})
export class FormValidation implements OnInit {
  private fb = inject(FormBuilder);

  validationForm: FormGroup;

  ngOnInit() {
    this.validationForm = this.fb.group({
      firstName: [
        "",
        [
          Validators.required,
          Validators.pattern("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"),
        ],
      ],
      lastName: [
        "",
        [
          Validators.required,
          Validators.pattern("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"),
        ],
      ],
      username: [
        "",
        [
          Validators.required,
          Validators.pattern("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"),
        ],
      ],
      city: ["", Validators.required],
      state: ["", Validators.required],
      zip: ["", Validators.required],
    });
  }
}
