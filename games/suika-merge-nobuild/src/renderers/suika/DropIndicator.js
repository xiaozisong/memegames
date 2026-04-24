import * as PIXI from "pixi.js";
export class DropIndicator {
    constructor(warningTexture) {
        this.root = new PIXI.Container();
        this.warningLine = new PIXI.Graphics();
        this.pointer = new PIXI.Graphics();
        this.warningY = 120;
        this.pulseMs = 0;
        if (warningTexture) {
            this.warningSprite = new PIXI.Sprite(warningTexture);
            this.warningSprite.anchor.set(0.5, 0.5);
            this.warningSprite.visible = false;
        }
        this.root.addChild(this.warningLine, this.pointer);
        if (this.warningSprite)
            this.root.addChild(this.warningSprite);
    }
    render(worldWidth, warningLineY, pointerX, showWarning, nextFruitTexture, nextFruitRadius = 18) {
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
        }
        else {
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
                this.nextFruitSprite = new PIXI.Sprite(nextFruitTexture);
                this.nextFruitSprite.anchor.set(0.5, 1);
                this.root.addChild(this.nextFruitSprite);
            }
            else if (this.nextFruitSprite.texture !== nextFruitTexture) {
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
        if (this.nextFruitSprite)
            this.nextFruitSprite.visible = false;
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
    get warningLineY() {
        return this.warningY;
    }
    tick(deltaMs) {
        this.pulseMs += deltaMs;
    }
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}
