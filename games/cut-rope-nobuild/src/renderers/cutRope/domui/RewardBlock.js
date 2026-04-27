export class RewardBlock {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "cut-rope-reward";

    this.icon = document.createElement("div");
    this.icon.className = "cut-rope-reward-icon";
    this.icon.textContent = "⭐";

    this.copy = document.createElement("div");
    this.label = document.createElement("div");
    this.label.className = "cut-rope-reward-label";
    this.value = document.createElement("div");
    this.value.className = "cut-rope-reward-value";

    this.copy.append(this.label, this.value);
    this.element.append(this.icon, this.copy);
  }

  setValue(value, label = "STARS", icon = "⭐") {
    this.icon.textContent = String(icon ?? "⭐");
    this.label.textContent = String(label ?? "STARS");
    this.value.textContent = String(value ?? "");
  }
}
