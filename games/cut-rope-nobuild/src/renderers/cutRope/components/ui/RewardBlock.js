import * as PIXI from "pixi.js";
import { CardContainer } from "./CardContainer.js";

export class RewardBlock {
  constructor(parent) {
    this.container = new PIXI.Container();
    parent.addChild(this.container);

    this.card = new CardContainer(this.container, {
      radius: 24,
      shadowAlpha: 0.08,
      shadowOffsetY: 8,
      shadowSteps: 3,
    });
    this.icon = new PIXI.Text({
      text: "★",
      style: {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: "700",
        fill: 0x22c55e,
      },
    });
    this.icon.anchor.set(0.5);
    this.label = new PIXI.Text({
      text: "STARS",
      style: {
        fontFamily: "Arial",
        fontSize: 14,
        fontWeight: "700",
        fill: 0x6b7280,
      },
    });
    this.value = new PIXI.Text({
      text: "0/0",
      style: {
        fontFamily: "Arial",
        fontSize: 22,
        fontWeight: "700",
        fill: 0x1f2937,
      },
    });
    this.container.addChild(this.icon, this.label, this.value);
    this.bounds = new PIXI.Rectangle();
  }

  layout(x, y, width, height, style = {}) {
    this.bounds = this.card.layout(x, y, width, height, {
      backgroundColor: style.backgroundColor ?? 0xffffff,
      backgroundAlpha: 1,
      borderColor: style.borderColor ?? 0xd1fae5,
      borderAlpha: style.borderAlpha ?? 1,
      borderWidth: style.borderWidth ?? 1,
      shadowColor: 0x111827,
    });
    this.icon.style.fill = style.iconColor ?? 0x22c55e;
    this.label.style.fill = style.labelColor ?? 0x6b7280;
    this.value.style.fill = style.valueColor ?? 0x1f2937;

    this.icon.position.set(x + 24, y + height * 0.5);
    this.label.position.set(x + 48, y + 16);
    this.value.position.set(x + 48, y + 36);
  }

  setValue(value, label = "STARS") {
    this.label.text = String(label ?? "STARS");
    this.value.text = String(value ?? "");
  }
}
