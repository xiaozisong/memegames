import * as PIXI from "pixi.js";

export type BlockViewModel = {
  id: string;
  memeId: string;
  label: string;
  color: number;
  row: number;
  col: number;
};

export class Block extends PIXI.Container {
  readonly id: string;
  readonly memeId: string;
  private base: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private text: PIXI.Text;

  constructor(model: BlockViewModel, size: number) {
    super();
    this.id = model.id;
    this.memeId = model.memeId;
    this.base = new PIXI.Graphics();
    this.glow = new PIXI.Graphics();
    this.text = new PIXI.Text({
      text: model.label,
      style: {
        fill: 0xffffff,
        fontFamily: "Arial Black, Arial",
        fontSize: Math.max(14, Math.floor(size * 0.34)),
        fontWeight: "700",
      },
    });
    this.addChild(this.glow);
    this.addChild(this.base);
    this.addChild(this.text);
    this.draw(size, model.color);
  }

  private draw(size: number, color: number): void {
    const r = size * 0.45;
    this.glow
      .clear()
      .circle(0, 0, r + 4)
      .fill({ color, alpha: 0.22 })
      .circle(0, 0, r + 1)
      .stroke({ color, alpha: 0.6, width: 2 });
    this.base
      .clear()
      .circle(0, 0, r)
      .fill({ color, alpha: 0.94 })
      .circle(-r * 0.22, -r * 0.28, r * 0.45)
      .fill({ color: 0xffffff, alpha: 0.24 });
    this.text.anchor.set(0.5);
    this.text.position.set(0, 0);
  }

  setPressed(active: boolean): void {
    this.scale.set(active ? 0.95 : 1);
  }
}
