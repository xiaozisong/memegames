import * as PIXI from "pixi.js";

export function createTileSprite(tile, tileDef, texture, size, glowColor, toColorNumber) {
  const container = new PIXI.Container();
  container.label = `tile:${tile.id}`;

  const glow = new PIXI.Graphics();
  glow.circle(0, 0, size * 0.42).fill({ color: glowColor, alpha: 0.18 });
  glow.circle(0, 0, size * 0.34).fill({ color: glowColor, alpha: 0.14 });
  glow.circle(0, 0, size * 0.28).fill({ color: glowColor, alpha: 0.1 });
  glow.blendMode = PIXI.BLEND_MODES?.ADD ?? "add";
  container.addChild(glow);

  const backPlate = new PIXI.Graphics();
  backPlate.circle(0, 0, size * 0.36).fill({ color: toColorNumber("oklch(0.18 0.03 265)", 0x18233a), alpha: 0.92 });
  backPlate.circle(0, 0, size * 0.36).stroke({ color: 0xffffff, alpha: 0.16, width: Math.max(1, size * 0.02) });
  container.addChild(backPlate);

  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.width = size * 0.68;
  sprite.height = size * 0.68;
  sprite.roundPixels = true;

  const mask = new PIXI.Graphics();
  mask.circle(0, 0, size * 0.32).fill({ color: 0xffffff, alpha: 1 });
  sprite.mask = mask;
  container.addChild(sprite, mask);

  const shine = new PIXI.Graphics();
  shine.ellipse(-size * 0.08, -size * 0.18, size * 0.16, size * 0.08).fill({ color: 0xffffff, alpha: 0.18 });
  container.addChild(shine);

  container.__tileMeta = {
    id: tile.id,
    kind: tile.kind,
    name: tileDef?.name ?? tile.kind,
    glowColor,
  };
  container.__glow = glow;
  container.__sprite = sprite;
  container.__mask = mask;

  return container;
}
