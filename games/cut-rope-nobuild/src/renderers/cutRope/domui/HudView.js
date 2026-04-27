import { CardContainer } from "./CardContainer.js";
import { PrimaryButton } from "./PrimaryButton.js";

export class HudView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "cut-rope-hud";

    this.leftGroup = document.createElement("div");
    this.leftGroup.className = "cut-rope-hud-group cut-rope-hud-group-left";
    this.rightGroup = document.createElement("div");
    this.rightGroup.className = "cut-rope-hud-group cut-rope-hud-group-right";

    this.levelCard = new CardContainer("cut-rope-hud-pill");
    this.levelValue = document.createElement("div");
    this.levelValue.className = "cut-rope-hud-pill-text";
    this.levelCard.append(this.levelValue);

    this.scoreCard = new CardContainer("cut-rope-hud-pill");
    this.scoreValue = document.createElement("div");
    this.scoreValue.className = "cut-rope-hud-pill-text";
    this.scoreCard.append(this.scoreValue);

    this.starsCard = new CardContainer("cut-rope-hud-pill");
    this.starsValue = document.createElement("div");
    this.starsValue.className = "cut-rope-hud-pill-text";
    this.starsCard.append(this.starsValue);

    this.restartButton = new PrimaryButton("Restart");
    this.restartButton.element.classList.add("cut-rope-hud-restart");

    this.leftGroup.append(this.levelCard.element, this.scoreCard.element);
    this.rightGroup.append(this.starsCard.element, this.restartButton.element);
    this.element.append(this.leftGroup, this.rightGroup);
  }

  render(snapshot) {
    const levelIndex = snapshot.state?.level?.index ?? 1;
    this.levelValue.textContent = `第 ${levelIndex} 关`;
    this.scoreValue.textContent = `分数: ${snapshot.state?.score ?? 0}`;
    this.starsValue.textContent = `⭐ ${snapshot.state?.collectedStars ?? 0}/${snapshot.state?.totalStars ?? 0}`;
    this.restartButton.setLabel(snapshot.presentation?.restartButtonText ?? "Restart");
  }
}
