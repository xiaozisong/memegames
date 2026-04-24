import * as PIXI from "pixi.js";

export class DropIndicator {
  readonly root = new PIXI.Container();
  private warningLine = new PIXI.Graphics();
  private warningSprite?: any;
  private pointer = new PIXI.Graphics();
  private nextFruitSprite?: any;
  private warningY = 120;
  private pulseMs = 0;

  constructor(warningTexture?: any) {
    if (warningTexture) {
      this.warningSprite = new (PIXI as any).Sprite(warningTexture);
      this.warningSprite.anchor.set(0.5, 0.5);
      this.warningSprite.visible = false;
    }
    this.root.addChild(this.warningLine, this.pointer);
    if (this.warningSprite) this.root.addChild(this.warningSprite);
  }

  render(
    worldWidth: number,
    warningLineY: number,
    pointerX: number,
    showWarning: boolean,
    nextFruitTexture?: any,
    nextFruitRadius = 18,
  ): void {
    this.warningY = warningLineY;
    const breath = 0.52 + Math.sin(this.pulseMs / 220) * 0.32;
    this.warningLine.clear();
    if (!this.warningSprite) {
      if (showWarning) {
        this.warningLine
          .moveTo(0, warningLineY)
          .lineTo(worldWidth, warningLineY)
          .stroke({ width: 2, color: 0xff6b6b, alpha: breath });
      }
    } else {
      this.warningSprite.visible = showWarning;
      if (showWarning) {
        this.warningSprite.position.set(worldWidth * 0.5, warningLineY);
        this.warningSprite.width = worldWidth - 20;
        this.warningSprite.height = 26;
        this.warningSprite.alpha = breath;
      }
    }

    if (nextFruitTexture) {
      if (!this.nextFruitSprite) {
        this.nextFruitSprite = new (PIXI as any).Sprite(nextFruitTexture);
        this.nextFruitSprite.anchor.set(0.5, 1);
        this.root.addChild(this.nextFruitSprite);
      } else if (this.nextFruitSprite.texture !== nextFruitTexture) {
        this.nextFruitSprite.texture = nextFruitTexture;
      }
      const diameter = Math.max(26, Math.min(80, nextFruitRadius * 2));
      const previewX = this.clamp(pointerX, diameter * 0.5 + 2, worldWidth - diameter * 0.5 - 2);
      this.nextFruitSprite.visible = true;
      this.nextFruitSprite.position.set(previewX, warningLineY - 6);
      this.nextFruitSprite.width = diameter;
      this.nextFruitSprite.height = diameter;
      this.nextFruitSprite.alpha = 0.96;
      this.pointer.clear();
      return;
    }
    if (this.nextFruitSprite) this.nextFruitSprite.visible = false;

    const fallbackX = this.clamp(pointerX, 16, worldWidth - 16);
    this.pointer.clear();
    this.pointer
      .roundRect(fallbackX - 14, warningLineY - 30, 28, 16, 8)
      .fill({ color: 0x4fc3ff, alpha: 0.95 });
    this.pointer
      .moveTo(fallbackX, warningLineY - 6)
      .lineTo(fallbackX - 7, warningLineY - 18)
      .lineTo(fallbackX + 7, warningLineY - 18)
      .closePath()
      .fill({ color: 0x4fc3ff, alpha: 0.95 });
  }

  get warningLineY(): number {
    return this.warningY;
  }

  tick(deltaMs: number): void {
    this.pulseMs += deltaMs;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
