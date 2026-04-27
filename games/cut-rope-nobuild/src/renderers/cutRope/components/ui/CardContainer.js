import * as PIXI from "pixi.js";

export class CardContainer {
  constructor(parent, options = {}) {
    this.radius = Number(options.radius ?? 24);
    this.shadowAlpha = Number(options.shadowAlpha ?? 0.1);
    this.shadowOffsetY = Number(options.shadowOffsetY ?? 8);
    this.shadowSteps = Number(options.shadowSteps ?? 4);
    this.container = new PIXI.Container();
    this.shadow = new PIXI.Graphics();
    this.surface = new PIXI.Graphics();
    this.content = new PIXI.Container();
    this.container.addChild(this.shadow, this.surface, this.content);
    parent.addChild(this.container);
    this.bounds = new PIXI.Rectangle();
  }

  layout(x, y, width, height, style = {}) {
    this.bounds = new PIXI.Rectangle(x, y, width, height);
    this.container.position.set(x, y);
    this.draw(width, height, style);
    return this.bounds;
  }

  draw(width, height, style = {}) {
    const backgroundColor = style.backgroundColor ?? 0xffffff;
    const backgroundAlpha = style.backgroundAlpha ?? 1;
    const borderColor = style.borderColor ?? backgroundColor;
    const borderAlpha = style.borderAlpha ?? 0;
    const borderWidth = style.borderWidth ?? 0;
    const shadowColor = style.shadowColor ?? 0x111827;

    this.shadow.clear();
    for (let index = 0; index < this.shadowSteps; index += 1) {
      const expand = index * 4;
      this.shadow.roundRect(
        0 - expand * 0.5,
        this.shadowOffsetY - expand * 0.25,
        width + expand,
        height + expand * 0.75,
        this.radius + expand * 0.4,
      ).fill({
        color: shadowColor,
        alpha: this.shadowAlpha / (index + 1.8),
      });
    }

    this.surface.clear();
    this.surface.roundRect(0, 0, width, height, this.radius).fill({
      color: backgroundColor,
      alpha: backgroundAlpha,
    });
    if (borderWidth > 0 && borderAlpha > 0) {
      this.surface.roundRect(0, 0, width, height, this.radius).stroke({
        color: borderColor,
        width: borderWidth,
        alpha: borderAlpha,
      });
    }
  }
}
