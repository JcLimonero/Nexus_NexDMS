import {
  Component,
  Input,
  TemplateRef,
  ViewEncapsulation,
  inject,
} from "@angular/core";

import {
  ModalDismissReasons,
  NgbActiveModal,
  NgbModal,
  NgbModalConfig,
  NgbModule,
} from "@ng-bootstrap/ng-bootstrap";

interface ModalContext {
  title: string;
  message: string;
}

@Component({
  selector: "ngbd-modal-content",
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Hi there!</h4>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss('Cross click')"
      ></button>
    </div>
    <div class="modal-body">
      <p>Hello, {{ name }}!</p>
    </div>
    <div class="modal-footer">
      <button
        type="button"
        class="btn btn-outline-dark"
        (click)="activeModal.close('Close click')"
      >
        Close
      </button>
    </div>
  `,
})
export class NgbdModalContent {
  activeModal = inject(NgbActiveModal);
  @Input() name: string = "World"; //
}

@Component({
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Hi there!</h4>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss('Cross click')"
      ></button>
    </div>
    <div class="modal-body">
      <p>Hello, World!</p>
      <p>
        <button class="btn btn-lg btn-outline-primary" (click)="open()">
          Launch demo modal
        </button>
      </p>
    </div>
    <div class="modal-footer">
      <button
        type="button"
        class="btn btn-outline-dark"
        (click)="activeModal.close('Close click')"
      >
        Close
      </button>
    </div>
  `,
})
export class NgbdModal1Content {
  private modalService = inject(NgbModal);
  activeModal = inject(NgbActiveModal);

  open() {
    this.modalService.open(NgbdModal2Content, {
      size: "lg",
    });
  }
}

@Component({
  template: `
    <div class="modal-header">
      <h4 class="modal-title">Hi there!</h4>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss('Cross click')"
      ></button>
    </div>
    <div class="modal-body">
      <p>Hello, World!</p>
    </div>
    <div class="modal-footer">
      <button
        type="button"
        class="btn btn-outline-dark"
        (click)="activeModal.close('Close click')"
      >
        Close
      </button>
    </div>
  `,
})
export class NgbdModal2Content {
  activeModal = inject(NgbActiveModal);
}

@Component({
  selector: "app-modal",
  imports: [NgbModule],
  templateUrl: "./modal.html",
  styleUrls: ["./modal.scss"],
  encapsulation: ViewEncapsulation.None,
  providers: [NgbModalConfig, NgbModal],
})
export class Modal {
  private modalService = inject(NgbModal);

  closeResult: string;

  constructor() {
    const config = inject(NgbModalConfig);

    // customize default values of modals used by this component tree
    config.backdrop = "static";
    config.keyboard = false;
  }

  open(content: TemplateRef<ModalContext>) {
    this.modalService
      .open(content, { ariaLabelledBy: "modal-basic-title" })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      );
  }

  private getDismissReason(reason: number): string {
    if (reason === ModalDismissReasons.ESC) {
      return "by pressing ESC";
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return "by clicking on a backdrop";
    } else {
      return `with: ${reason}`;
    }
  }

  openModal() {
    const modalRef = this.modalService.open(NgbdModalContent);
    modalRef.componentInstance.name = "World";
  }

  openBackDropCustomClass(content: TemplateRef<ModalContext>) {
    this.modalService.open(content, { backdropClass: "light-blue-backdrop" });
  }

  openWindowCustomClass(content: TemplateRef<ModalContext>) {
    this.modalService.open(content, { windowClass: "dark-modal" });
  }

  openSm(content: TemplateRef<ModalContext>) {
    this.modalService.open(content, { size: "sm" });
  }

  openLg(content: TemplateRef<ModalContext>) {
    this.modalService.open(content, { size: "lg" });
  }

  openVerticallyCentered(content: TemplateRef<ModalContext>) {
    this.modalService.open(content, { centered: true });
  }

  openStackedModal() {
    this.modalService.open(NgbdModal1Content);
  }

  openCustomModal(content: TemplateRef<ModalContext>) {
    this.modalService.open(content);
  }
}
