export class TitleText {
  constructor() {
    this.element = document.createElement("h2");
    this.element.className = "cut-rope-ui-title";
  }

  setText(value) {
    this.element.textContent = String(value ?? "");
  }
}
