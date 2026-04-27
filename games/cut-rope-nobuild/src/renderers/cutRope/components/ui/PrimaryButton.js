import * as PIXI from "pixi.js";
import { CardContainer } from "./CardContainer.js";

export class PrimaryButton {
  constructor(parent, options = {}) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);
    this.card = new CardContainer(this.container, {
      radius: options.radius ?? 24,
      shadowAlpha: 0.1,
      shadowOffsetY: 8,
      shadowSteps: 3,
    });
    this.label = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "Arial",
        fontSize: options.fontSize ?? 18,
        fontWeight: "700",
        fill: options.textColor ?? 0xffffff,
        align: "center",
      },
    });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);

    this.pressed = false;
    this.enabled = true;
    this.scaleValue = 1;
    this.targetScale = 1;
    this.bounds = new PIXI.Rectangle();
  }

  layout(x, y, width, height, style = {}) {
    this.bounds = this.card.layout(x, y, width, height, {
      backgroundColor: style.backgroundColor ?? 0x22c55e,
      backgroundAlpha: style.backgroundAlpha ?? 1,
      borderColor: style.borderColor ?? style.backgroundColor ?? 0x22c55e,
      borderAlpha: style.borderAlpha ?? 0,
      borderWidth: style.borderWidth ?? 0,
      shadowColor: style.shadowColor ?? 0x111827,
    });
    this.label.style.fill = style.textColor ?? 0xffffff;
    this.label.text = style.label ?? this.label.text;
    this.label.position.set(x + width * 0.5, y + height * 0.5);
  }

  setLabel(value) {
    this.label.text = String(value ?? "");
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed && this.enabled);
    this.targetScale = this.pressed ? 0.95 : 1;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.setPressed(false);
    }
    this.container.alpha = this.enabled ? 1 : 0.5;
  }

  hitTest(globalPoint) {
    return this.enabled && this.bounds.contains(globalPoint.x, globalPoint.y);
  }

  update(dt) {
    const speed = Math.min(1, Math.max(0.08, Number(dt || 0.016) * 18));
    this.scaleValue += (this.targetScale - this.scaleValue) * speed;
    this.container.scale.set(this.scaleValue);
    this.container.alpha += ((this.pressed ? 0.92 : 1) - this.container.alpha) * speed;
  }
}
