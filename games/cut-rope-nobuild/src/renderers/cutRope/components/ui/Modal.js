import * as PIXI from "pixi.js";
import { CardContainer } from "./CardContainer.js";
import { PrimaryButton } from "./PrimaryButton.js";
import { RewardBlock } from "./RewardBlock.js";
import { TitleText } from "./TitleText.js";

export class Modal {
  constructor(parent) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);

    this.mask = new PIXI.Graphics();
    this.content = new PIXI.Container();
    this.container.addChild(this.mask, this.content);

    this.card = new CardContainer(this.content, {
      radius: 24,
      shadowAlpha: 0.12,
      shadowOffsetY: 10,
      shadowSteps: 4,
    });
    this.iconWrap = new PIXI.Graphics();
    this.iconText = new PIXI.Text({
      text: "★",
      style: { fontFamily: "Arial", fontSize: 28, fontWeight: "700", fill: 0xffffff },
    });
    this.iconText.anchor.set(0.5);
    this.title = new TitleText(this.content, { fontSize: 28, fill: 0x1f2937, wordWrapWidth: 360 });
    this.body = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "Arial",
        fontSize: 16,
        fontWeight: "500",
        fill: 0x6b7280,
        align: "center",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: 360,
      },
    });
    this.body.anchor.set(0.5, 0);
    this.rewardBlock = new RewardBlock(this.content);
    this.primaryButton = new PrimaryButton(this.content, { fontSize: 18, textColor: 0xffffff, radius: 24 });
    this.content.addChild(this.iconWrap, this.iconText, this.body);

    this.visibleTarget = false;
    this.progress = 0;
    this.buttonPressed = false;
    this.viewportCenter = { x: 0, y: 0 };
  }

  render(snapshot, layout, theme) {
    const overlay = snapshot.state?.overlay ?? { visible: false };
    this.visibleTarget = Boolean(overlay.visible);
    this.container.visible = this.visibleTarget || this.progress > 0.001;

    if (!this.container.visible) return;

    const panelWidth = Math.min(layout.width - 32, 420);
    const rewardWidth = Math.min(panelWidth - 48, 220);
    const buttonWidth = Math.min(panelWidth - 48, 220);
    const bodyWidth = panelWidth - 64;
    const rewardVisible = snapshot.state?.isOver ?? false;
    const bodyText = String(overlay.body ?? "");
    const titleText = String(overlay.title ?? "");

    this.title.setContent(titleText, { fill: theme.text, wordWrapWidth: panelWidth - 64 });
    this.body.text = bodyText;
    this.body.style.fill = theme.mutedText;
    this.body.style.wordWrapWidth = bodyWidth;

    const bodyHeight = Math.max(32, this.body.height);
    const rewardHeight = rewardVisible ? 72 : 0;
    const panelHeight = 32 + 56 + 24 + this.title.text.height + 16 + bodyHeight + (rewardVisible ? 24 + rewardHeight : 0) + 24 + 56 + 32;
    const panelX = (layout.width - panelWidth) * 0.5;
    const panelY = (layout.height - panelHeight) * 0.5;
    this.viewportCenter.x = layout.width * 0.5;
    this.viewportCenter.y = layout.height * 0.5;
    this.content.pivot.set(this.viewportCenter.x, this.viewportCenter.y);
    this.content.position.set(this.viewportCenter.x, this.viewportCenter.y);

    this.mask.clear();
    this.mask.rect(0, 0, layout.width, layout.height).fill({ color: 0x111827, alpha: 0.16 });

    this.card.layout(panelX, panelY, panelWidth, panelHeight, {
      backgroundColor: theme.surface,
      backgroundAlpha: 1,
      borderColor: theme.border,
      borderAlpha: 1,
      borderWidth: 1,
      shadowColor: 0x111827,
    });

    this.iconWrap.clear();
    this.iconWrap.circle(panelX + panelWidth * 0.5, panelY + 32 + 28, 28).fill({ color: theme.primary, alpha: 1 });
    this.iconText.style.fill = 0xffffff;
    this.iconText.position.set(panelX + panelWidth * 0.5, panelY + 32 + 28);

    this.title.setPosition(panelX + panelWidth * 0.5, panelY + 32 + 56 + 24);
    this.body.position.set(panelX + panelWidth * 0.5, panelY + 32 + 56 + 24 + this.title.text.height + 16);

    if (rewardVisible) {
      this.rewardBlock.container.visible = true;
      this.rewardBlock.setValue(`${snapshot.state?.collectedStars ?? 0}/${snapshot.state?.totalStars ?? 0}`, "STARS");
      this.rewardBlock.layout(panelX + (panelWidth - rewardWidth) * 0.5, this.body.y + bodyHeight + 24, rewardWidth, rewardHeight, {
        backgroundColor: 0xf9fafb,
        borderColor: theme.border,
        borderWidth: 1,
        borderAlpha: 1,
        iconColor: theme.primary,
        labelColor: theme.mutedText,
        valueColor: theme.text,
      });
    } else {
      this.rewardBlock.container.visible = false;
    }

    const buttonY = panelY + panelHeight - 32 - 56;
    this.primaryButton.setLabel(String(overlay.buttonText ?? ""));
    this.primaryButton.layout(panelX + (panelWidth - buttonWidth) * 0.5, buttonY, buttonWidth, 56, {
      label: String(overlay.buttonText ?? ""),
      backgroundColor: theme.primary,
      textColor: 0xffffff,
      shadowColor: 0x111827,
    });
  }

  update(dt) {
    const duration = 0.24;
    const delta = Math.max(0.001, Number(dt || 0.016)) / duration;
    this.progress = clamp(this.progress + (this.visibleTarget ? delta : -delta), 0, 1);
    this.container.visible = this.visibleTarget || this.progress > 0.001;
    this.mask.alpha = 0.16 * this.progress;
    this.content.alpha = this.progress;
    const scale = 0.92 + this.progress * 0.08;
    this.content.scale.set(scale);
    this.primaryButton.update(dt);
  }

  hitButton(globalPoint) {
    return this.container.visible && this.primaryButton.hitTest(globalPoint);
  }

  setButtonPressed(pressed) {
    this.buttonPressed = Boolean(pressed);
    this.primaryButton.setPressed(this.buttonPressed);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}
