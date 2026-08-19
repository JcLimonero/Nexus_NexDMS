import { JsonPipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: "app-buttons",
  imports: [NgbModule, FormsModule, ReactiveFormsModule, JsonPipe],
  templateUrl: "./buttons.html",
  styleUrls: ["./buttons.scss"],
})
export class Buttons implements OnInit {
  private formBuilder = inject(FormBuilder);

  public checkboxGroupForm: FormGroup;
  public radioGroupForm: FormGroup;

  ngOnInit() {
    this.checkboxGroupForm = this.formBuilder.group({
      left: true,
      middle: false,
      right: false,
    });
    this.radioGroupForm = this.formBuilder.group({
      model: 1,
    });
  }

  model = {
    left: true,
    middle: false,
    right: false,
  };

  modelRadio = 1;
}
