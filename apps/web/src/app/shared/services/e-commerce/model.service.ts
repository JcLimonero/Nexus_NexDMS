import { TemplateRef } from "@angular/core";

interface ModalContext {
  title: string;
  message: string;
}
interface ModalItem {
  id: string;
  template: TemplateRef<ModalContext>;
  open: () => void;
  close: () => void;
}

export class ModalService {
  private modals: ModalItem[] = [];

  add(modal: ModalItem) {
    // add modal to array of active modals
    this.modals.push(modal);
  }

  remove(id: string) {
    // remove modal from array of active modals
    this.modals = this.modals.filter((x) => x.id !== id);
  }

  open(id: string) {
    // open modal specified by id
    let modal = this.modals.filter((x) => x.id === id)[0];
    modal.open();
  }

  close(id: string) {
    // close modal specified by id
    let modal = this.modals.filter((x) => x.id === id)[0];
    modal.close();
  }
}
