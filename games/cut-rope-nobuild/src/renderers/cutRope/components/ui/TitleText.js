import * as PIXI from "pixi.js";

export class TitleText {
  constructor(parent, options = {}) {
    this.text = new PIXI.Text({
      text: "",
      style: {
        fontFamily: options.fontFamily ?? "Arial",
        fontSize: options.fontSize ?? 28,
        fontWeight: options.fontWeight ?? "700",
        fill: options.fill ?? 0x1f2937,
        align: options.align ?? "center",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: options.wordWrapWidth ?? 320,
      },
    });
    this.text.anchor.set(options.anchorX ?? 0.5, options.anchorY ?? 0);
    parent.addChild(this.text);
  }

  setContent(value, options = {}) {
    this.text.text = String(value ?? "");
    this.text.style.fill = options.fill ?? this.text.style.fill;
    this.text.style.fontSize = options.fontSize ?? this.text.style.fontSize;
    this.text.style.wordWrapWidth = options.wordWrapWidth ?? this.text.style.wordWrapWidth;
  }

  setPosition(x, y) {
    this.text.position.set(x, y);
  }
}
