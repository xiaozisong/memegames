import * as PIXI from "pixi.js";
import { CardContainer } from "./ui/CardContainer.js";
import { PrimaryButton } from "./ui/PrimaryButton.js";
import { RewardBlock } from "./ui/RewardBlock.js";
import { TitleText } from "./ui/TitleText.js";

export class HudView {
  constructor(parent) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);

    this.card = new CardContainer(this.container, {
      radius: 24,
      shadowAlpha: 0.1,
      shadowOffsetY: 10,
      shadowSteps: 4,
    });
    this.levelTitle = new TitleText(this.container, { fontSize: 24, fill: 0x1f2937, anchorX: 0, anchorY: 0 });
    this.levelSubtitle = new PIXI.Text({
      text: "LEVEL",
      style: { fontFamily: "Arial", fontSize: 14, fontWeight: "700", fill: 0x6b7280 },
    });
    this.rewardBlock = new RewardBlock(this.container);
    this.restartButton = new PrimaryButton(this.container, { fontSize: 16, radius: 24, textColor: 0xffffff });
    this.container.addChild(this.levelSubtitle);

    this.theme = null;
  }

  render(snapshot, layout, theme) {
    this.theme = theme;
    const state = snapshot.state ?? {};
    const x = layout.padding;
    const y = layout.padding;
    const width = layout.width - layout.padding * 2;
    const height = 96;
    const rewardWidth = 140;
    const buttonWidth = 124;
    const leftWidth = width - 32 - rewardWidth - 16 - buttonWidth;

    this.card.layout(x, y, width, height, {
      backgroundColor: theme.surface,
      backgroundAlpha: 1,
      borderColor: theme.border,
      borderAlpha: 1,
      borderWidth: 1,
      shadowColor: 0x111827,
    });

    this.levelSubtitle.text = "LEVEL";
    this.levelSubtitle.style.fill = theme.mutedText;
    this.levelSubtitle.position.set(x + 24, y + 20);

    this.levelTitle.setContent(`${state.level?.index ?? 1}/${snapshot.totalLevels ?? 1}  ${state.level?.name ?? ""}`, {
      fill: theme.text,
      wordWrapWidth: Math.max(180, leftWidth - 16),
    });
    this.levelTitle.setPosition(x + 24, y + 40);

    this.rewardBlock.setValue(`${state.collectedStars ?? 0}/${state.totalStars ?? 0}`, "STARS");
    this.rewardBlock.layout(x + width - buttonWidth - rewardWidth - 32, y + 12, rewardWidth, 72, {
      backgroundColor: 0xf9fafb,
      borderColor: theme.border,
      borderWidth: 1,
      borderAlpha: 1,
      iconColor: theme.primary,
      labelColor: theme.mutedText,
      valueColor: theme.text,
    });

    this.restartButton.setLabel(String(snapshot.presentation?.restartButtonText ?? "Restart"));
    this.restartButton.layout(x + width - buttonWidth - 16, y + 20, buttonWidth, 56, {
      label: String(snapshot.presentation?.restartButtonText ?? "Restart"),
      backgroundColor: theme.primary,
      textColor: 0xffffff,
      shadowColor: 0x111827,
    });
  }

  update(dt) {
    this.restartButton.update(dt);
  }

  hitRestartButton(globalPoint) {
    return this.restartButton.hitTest(globalPoint);
  }

  setRestartPressed(pressed) {
    this.restartButton.setPressed(pressed);
  }
}
