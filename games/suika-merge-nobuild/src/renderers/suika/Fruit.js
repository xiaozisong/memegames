import * as PIXI from "pixi.js";
export class Fruit extends PIXI.Container {
    constructor(textures) {
        super();
        this.ring = new PIXI.Graphics();
        this.sprite = new PIXI.Sprite();
        this.placeholder = new PIXI.Graphics();
        this.popTimer = 0;
        this.textures = textures;
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);
        this.addChild(this.placeholder);
        this.addChild(this.ring);
    }
    render(fruit) {
        this.position.set(fruit.x, fruit.y);
        this.rotation = fruit.angle;
        const texture = this.textures.get(fruit.type) ?? null;
        this.placeholder.clear();
        this.ring.clear();
        if (texture) {
            this.sprite.texture = texture;
            this.sprite.visible = true;
            this.sprite.width = fruit.radius * 2;
            this.sprite.height = fruit.radius * 2;
            this.placeholder.visible = false;
        }
        else {
            // Keep shape consistent even if an asset is missing.
            this.sprite.texture = PIXI.Texture.WHITE;
            this.sprite.visible = true;
            this.sprite.width = fruit.radius * 2;
            this.sprite.height = fruit.radius * 2;
            this.sprite.tint = 0x000000;
            this.sprite.alpha = 0;
            this.placeholder.visible = true;
            this.placeholder.circle(0, 0, fruit.radius).fill({ color: 0xffffff, alpha: 0.05 });
        }
        if (texture) {
            this.sprite.tint = 0xffffff;
            this.sprite.alpha = 1;
        }
        this.ring.circle(0, 0, fruit.radius).stroke({
            color: 0xffffff,
            alpha: 0.2,
            width: Math.max(1, fruit.radius * 0.08),
        });
    }
    popIn() {
        this.popTimer = 220;
        this.scale.set(0.72);
    }
    tick(deltaMs) {
        if (this.popTimer <= 0)
            return;
        this.popTimer -= deltaMs;
        const t = Math.max(0, this.popTimer) / 220;
        const eased = 1 - t * t;
        const scale = 0.72 + eased * 0.36;
        this.scale.set(Math.min(1, scale));
    }
}
