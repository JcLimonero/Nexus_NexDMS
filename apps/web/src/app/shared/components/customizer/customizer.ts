import { NgClass } from "@angular/common";
import { Component, inject, TemplateRef } from "@angular/core";

import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ToastrService } from "ngx-toastr";

import { ConfigData } from "../../data/config/config";
import { CustomizerService } from "../../services/customizer.service";

@Component({
  selector: "app-customizer",
  imports: [NgClass],
  templateUrl: "./customizer.html",
  styleUrls: ["./customizer.scss"],
})
export class Customizer {
  customize = inject(CustomizerService);
  private modalService = inject(NgbModal);
  private toastrService = inject(ToastrService);

  public customizer: string = "";
  public sidebarSetting: string = "color";
  public layoutType: string = "ltr";
  public sidebarType: string = "default";
  public data: ConfigData;

  constructor() {
    this.customize.data.color.layout_version =
      localStorage.getItem("layoutVersion") || "light";
    this.customize.data.color.color =
      localStorage.getItem("color") || "color-1";
    this.customize.data.color.primary_color =
      localStorage.getItem("primary_color") || "#4466f2";
    this.customize.data.color.secondary_color =
      localStorage.getItem("secondary_color") || "#1ea6ec";
  }

  // Open customizer
  openCustomizerSetting(val: string) {
    this.customizer = val;
  }

  // Sidebar customizer Settings
  customizerSetting(val: string) {
    this.sidebarSetting = val;
  }

  // Customize Layout Type
  customizeLayoutType(val: string) {
    this.customize.setLayoutType(val);
    this.layoutType = val;
  }

  // Customize Sidebar Type
  customizeSidebarType(val: string) {
    if (val == "default") {
      this.customize.data.settings.sidebar.type = "default";
      this.customize.data.settings.sidebar.body_type = "default";
    } else if (val == "compact") {
      this.customize.data.settings.sidebar.type = "compact-wrapper";
      this.customize.data.settings.sidebar.body_type = "sidebar-icon";
    } else if (val == "compact-icon") {
      this.customize.data.settings.sidebar.type = "compact-page";
      this.customize.data.settings.sidebar.body_type = "sidebar-hover";
    }
    this.sidebarType = val;
  }

  // Customize Sidebar Setting
  customizeSidebarSetting(val: string) {
    this.customize.data.settings.sidebar_setting = val;
  }

  // Customize Sidebar Backround
  customizeSidebarBackround(val: string) {
    this.customize.data.settings.sidebar_backround = val;
  }

  // Customize Mix Layout
  customizeMixLayout(val: string) {
    this.customize.setLayout(val);
  }

  // Customize Light Color
  customizeLightColorScheme(val: string) {
    this.customize.setColorLightScheme(val);
  }

  // Customize Dark Color
  customizeDarkColorScheme(val: string) {
    this.customize.setColorDarkScheme(val);
  }

  //Display modal for copy config
  copyConfig(popup: TemplateRef<void>, _data: ConfigData) {
    this.modalService.open(popup, {
      backdropClass: "dark-modal",
      centered: true,
    });
    this.customize.data;
  }

  //Copy config
  copyText(data: ConfigData) {
    let selBox = document.createElement("textarea");
    selBox.style.position = "fixed";
    selBox.style.left = "0";
    selBox.style.top = "0";
    selBox.style.opacity = "0";
    selBox.value = JSON.stringify(data);
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand("copy");
    document.body.removeChild(selBox);
    this.toastrService.show(
      '<p class="mb-0 mt-1">Code Copied to clipboard</p>',
      "",
      {
        closeButton: true,
        enableHtml: true,
        positionClass: "toast-bottom-right",
      },
    );
  }
}
