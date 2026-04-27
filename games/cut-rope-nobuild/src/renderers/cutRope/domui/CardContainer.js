export class CardContainer {
  constructor(className = "") {
    this.element = document.createElement("section");
    this.element.className = `cut-rope-ui-card ${className}`.trim();
  }

  append(...children) {
    this.element.append(...children);
  }
}
