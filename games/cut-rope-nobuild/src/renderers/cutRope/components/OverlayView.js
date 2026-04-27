import { Modal } from "./ui/Modal.js";

export class OverlayView {
  constructor(parent) {
    this.modal = new Modal(parent);
  }

  render(snapshot, layout, theme) {
    this.modal.render(snapshot, layout, theme);
  }

  hitButton(globalPoint) {
    return this.modal.hitButton(globalPoint);
  }

  setButtonPressed(pressed) {
    this.modal.setButtonPressed(pressed);
  }

  update(dt) {
    this.modal.update(dt);
  }
}
