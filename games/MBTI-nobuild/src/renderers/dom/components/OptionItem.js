export class OptionItem {
  constructor({ option, optionIndex, onSelect }) {
    this.element = document.createElement("button");
    this.element.type = "button";
    this.element.className = "mbti-option";
    this.element.addEventListener("click", () => {
      onSelect?.(option.id);
    });

    this.copy = document.createElement("div");
    this.copy.className = "mbti-option-copy";

    this.label = document.createElement("div");
    this.label.className = "mbti-option-label";
    this.label.textContent = option.label;

    this.note = document.createElement("div");
    this.note.className = "mbti-option-note";
    this.note.textContent = option.note;

    this.badge = document.createElement("span");
    this.badge.className = "mbti-option-badge";
    this.badge.setAttribute("aria-hidden", "true");
    this.badge.textContent = String.fromCharCode(65 + optionIndex);

    this.element.appendChild(this.badge);
    this.copy.appendChild(this.label);
    if (option.note) {
      this.copy.appendChild(this.note);
    }

    this.element.appendChild(this.copy);
  }
}
