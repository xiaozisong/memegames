import * as PIXI from "pixi.js";
import { FruitSnapshot } from "../../core/contracts";
import { Fruit } from "./Fruit";
import { FruitTextureMap } from "./fruitAssets";

type MergeFx = {
  x: number;
  y: number;
  radius: number;
  targetType: string;
  life: number;
  maxLife: number;
  spriteA: PIXI.Sprite;
  spriteB: PIXI.Sprite;
};

type MergeInfo = {
  x: number;
  y: number;
  radius: number;
  targetType: string;
};

type FruitContainerOptions = {
  onMerge?: (info: MergeInfo) => void;
  mergeFrameA?: PIXI.Texture;
  mergeFrameB?: PIXI.Texture;
};

export class FruitContainer {
  readonly root = new PIXI.Container();
  private fruitById = new Map<string, Fruit>();
  private fxLayer = new PIXI.Container();
  private mergeFx: MergeFx[] = [];
  private previousFruits: FruitSnapshot[] = [];
  private options: FruitContainerOptions;

  constructor(private textures: FruitTextureMap, options: FruitContainerOptions = {}) {
    this.options = options;
    this.root.addChild(this.fxLayer);
  }

  render(fruits: FruitSnapshot[]): void {
    const incoming = new Set(fruits.map((item) => item.id));
    for (const [id, view] of this.fruitById.entries()) {
      if (incoming.has(id)) continue;
      this.fruitById.delete(id);
      this.root.removeChild(view);
      view.destroy({ children: true });
    }

    for (const fruit of fruits) {
      let view = this.fruitById.get(fruit.id);
      if (!view) {
        view = new Fruit(this.textures);
        view.popIn();
        this.fruitById.set(fruit.id, view);
        this.root.addChild(view);
      }
      view.render(fruit);
    }

    this.spawnMergeFxIfNeeded(this.previousFruits, fruits);
    this.previousFruits = fruits.map((item) => ({ ...item }));
  }

  tick(deltaMs: number): void {
    for (const view of this.fruitById.values()) {
      view.tick(deltaMs);
    }

    for (let i = this.mergeFx.length - 1; i >= 0; i -= 1) {
      const fx = this.mergeFx[i];
      fx.life += deltaMs;
      const t = Math.min(1, fx.life / fx.maxLife);
      const alpha = 1 - t;
      const pulse = 1 + Math.sin(t * Math.PI) * 0.08;
      const spread = 1 + t * 0.35;
      const finalScale = (fx.radius / 40) * spread * pulse;

      fx.spriteA.position.set(fx.x, fx.y);
      fx.spriteA.scale.set(finalScale);
      fx.spriteA.alpha = t < 0.55 ? alpha : 0;

      fx.spriteB.position.set(fx.x, fx.y);
      fx.spriteB.scale.set(finalScale * 1.08);
      fx.spriteB.alpha = t > 0.25 ? alpha : 0;

      if (t >= 1) {
        this.fxLayer.removeChild(fx.spriteA, fx.spriteB);
        fx.spriteA.destroy();
        fx.spriteB.destroy();
        this.mergeFx.splice(i, 1);
      }
    }
  }

  private spawnMergeFxIfNeeded(previous: FruitSnapshot[], next: FruitSnapshot[]): void {
    if (previous.length < 2) return;
    const oldIds = new Set(previous.map((item) => item.id));
    const newIds = new Set(next.map((item) => item.id));
    const removed = previous.filter((item) => !newIds.has(item.id));
    const added = next.filter((item) => !oldIds.has(item.id));
    if (removed.length < 2 || added.length === 0) return;
    const origin = removed[0];
    const target = added[0]!;
    const baseRadius = Math.max(12, target.radius);
    const frameA = this.options.mergeFrameA ?? this.textures.get("boom1") ?? PIXI.Texture.EMPTY;
    const frameB = this.options.mergeFrameB ?? this.textures.get("boom2") ?? PIXI.Texture.EMPTY;
    const spriteA = new PIXI.Sprite(frameA);
    const spriteB = new PIXI.Sprite(frameB);
    spriteA.anchor.set(0.5);
    spriteB.anchor.set(0.5);
    spriteA.position.set(origin.x, origin.y);
    spriteB.position.set(origin.x, origin.y);
    spriteA.alpha = 0;
    spriteB.alpha = 0;
    this.fxLayer.addChild(spriteA, spriteB);
    this.mergeFx.push({
      x: origin.x,
      y: origin.y,
      radius: baseRadius,
      targetType: target.type,
      life: 0,
      maxLife: 260,
      spriteA,
      spriteB,
    });
    this.options.onMerge?.({
      x: origin.x,
      y: origin.y,
      radius: baseRadius,
      targetType: target.type,
    });
  }
}
