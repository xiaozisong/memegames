export class PrimaryButton {
  constructor(label = "") {
    this.element = document.createElement("button");
    this.element.type = "button";
    this.element.className = "cut-rope-ui-button";
    this.setLabel(label);

    this.element.addEventListener("pointerdown", () => {
      this.element.classList.add("is-pressed");
    });
    this.element.addEventListener("pointerup", () => {
      this.element.classList.remove("is-pressed");
    });
    this.element.addEventListener("pointerleave", () => {
      this.element.classList.remove("is-pressed");
    });
    this.element.addEventListener("pointercancel", () => {
      this.element.classList.remove("is-pressed");
    });
  }

  setLabel(value) {
    this.element.textContent = String(value ?? "");
  }

  onClick(handler) {
    this.element.addEventListener("click", handler);
  }
}
