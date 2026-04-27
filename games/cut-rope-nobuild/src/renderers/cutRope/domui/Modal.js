import { CardContainer } from "./CardContainer.js";
import { PrimaryButton } from "./PrimaryButton.js";
import { RewardBlock } from "./RewardBlock.js";
import { TitleText } from "./TitleText.js";

export class Modal {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "cut-rope-modal";

    this.backdrop = document.createElement("div");
    this.backdrop.className = "cut-rope-modal-backdrop";

    this.card = new CardContainer("cut-rope-modal-card");
    this.icon = document.createElement("div");
    this.icon.className = "cut-rope-modal-icon";
    this.icon.textContent = "★";

    this.title = new TitleText();
    this.body = document.createElement("p");
    this.body.className = "cut-rope-modal-body";

    this.reward = new RewardBlock();
    this.button = new PrimaryButton("");

    this.card.append(this.icon, this.title.element, this.body, this.reward.element, this.button.element);
    this.element.append(this.backdrop, this.card.element);
  }

  render(snapshot) {
    const overlay = snapshot.state?.overlay ?? { visible: false };
    const isVisible = Boolean(overlay.visible);
    this.element.classList.toggle("is-visible", isVisible);
    this.button.element.disabled = !isVisible;

    this.title.setText(overlay.title ?? "");
    this.body.textContent = String(overlay.body ?? "");
    this.button.setLabel(overlay.buttonText ?? "");

    const showReward = Boolean(snapshot.state?.isOver);
    this.reward.element.style.display = showReward ? "" : "none";
    if (showReward) {
      this.reward.setValue(`${snapshot.state?.collectedStars ?? 0}/${snapshot.state?.totalStars ?? 0}`, "STARS");
    }
  }
}
