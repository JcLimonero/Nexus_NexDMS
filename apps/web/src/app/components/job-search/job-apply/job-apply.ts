import { Component, OnInit, inject } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { JobCategory, JobDB } from "../../../shared/data/job-search/job-search";
import { JobFilter } from "../job-filter/job-filter";

interface dropdown {
  id: number;
  itemName: string;
}

export interface DropdownSettings {
  singleSelection: boolean;
  text: string;
  selectAllText: string;
  unSelectAllText: string;
  enableSearchFilter: boolean;
  classes: string;
}

@Component({
  selector: "app-job-apply",
  imports: [
    JobFilter,
    RouterModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: "./job-apply.html",
  styleUrls: ["./job-apply.scss"],
})
export class JobApply implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  public jobs: JobCategory[];
  public arr: JobCategory;
  public jobForm: FormGroup;
  public dropdownList: dropdown[];
  public selectedItems: dropdown[];
  public dropdownSettings: DropdownSettings;
  model1: Date;
  model2: Date;
  model3: Date;
  model4: Date;
  model5: Date;

  constructor() {
    this.jobForm = this.fb.group({
      personalDetails: ["", Validators.required],
      phone: ["", Validators.required],
      email: ["", Validators.email],
      password: ["", Validators.required],
      resetPassword: ["", Validators.required],
      collegeName: ["", Validators.required],
      specialization: ["", Validators.required],
      location: ["", Validators.required],
      company_name: ["", Validators.required],
    });

    this.jobs = JobDB.Job_Category;
    this.route.params.subscribe((params) => {
      const id = +params["id"];
      this.jobs.filter((items) => {
        if (items.Id === id) {
          this.arr = items;
        }
      });
    });
  }

  ngOnInit() {
    this.dropdownList = [
      { id: 1, itemName: "India" },
      { id: 2, itemName: "Singapore" },
      { id: 3, itemName: "Australia" },
      { id: 4, itemName: "Canada" },
      { id: 5, itemName: "South Korea" },
      { id: 6, itemName: "Germany" },
      { id: 7, itemName: "France" },
      { id: 8, itemName: "Russia" },
      { id: 9, itemName: "Italy" },
      { id: 10, itemName: "Sweden" },
    ];
    this.selectedItems = [
      { id: 2, itemName: "Singapore" },
      { id: 3, itemName: "Australia" },
      { id: 4, itemName: "Canada" },
      { id: 5, itemName: "South Korea" },
    ];
    this.dropdownSettings = {
      singleSelection: false,
      text: "Select Countries",
      selectAllText: "Select All",
      unSelectAllText: "UnSelect All",
      enableSearchFilter: true,
      classes: "myclass custom-class",
    };
  }

  save() {}
}
