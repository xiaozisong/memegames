import * as PIXI from "pixi.js";

export function createEntityView(assetConfig = {}) {
  const config = normalizeAssetConfig(assetConfig);
  if (config.type === "sprite") {
    return createSpriteView(config);
  }
  return createShapeView(config);
}

export async function preloadAssetConfigs(assetConfigs = []) {
  const sources = Array.from(
    new Set(
      (Array.isArray(assetConfigs) ? assetConfigs : [])
        .map((assetConfig) => normalizeAssetConfig(assetConfig).src)
        .filter(Boolean),
    ),
  );
  await Promise.all(
    sources.map(async (src) => {
      try {
        await PIXI.Assets.load(src);
      } catch (error) {
        console.warn(`[tower-defense] Failed to preload asset: ${src}`, error);
      }
    }),
  );
}

export function getAssetViewKey(assetConfig = {}) {
  const config = normalizeAssetConfig(assetConfig);
  return JSON.stringify({
    type: config.type,
    src: config.src ?? "",
    shape: config.shape,
    color: config.color,
    tint: config.tint ?? "",
    radius: config.radius ?? null,
    size: config.size ?? null,
    width: config.width ?? null,
    height: config.height ?? null,
  });
}

export function hasAssetSource(assetConfig = {}) {
  return Boolean(normalizeAssetConfig(assetConfig).src);
}

export function getAssetSource(assetConfig = {}) {
  return normalizeAssetConfig(assetConfig).src ?? "";
}

export function getEntityFootprint(assetConfig = {}) {
  const config = normalizeAssetConfig(assetConfig);
  if (typeof config.radius === "number") return config.radius * 2;
  if (typeof config.size === "number") return config.size;
  if (typeof config.width === "number" && typeof config.height === "number") {
    return Math.max(config.width, config.height);
  }
  return 24;
}

export function applyEntityDisplayScale(view, scale = 1) {
  const safeScale = Number.isFinite(Number(scale)) ? Number(scale) : 1;
  if (view instanceof PIXI.Sprite && Number.isFinite(view.__assetBaseWidth) && Number.isFinite(view.__assetBaseHeight)) {
    view.width = view.__assetBaseWidth * safeScale;
    view.height = view.__assetBaseHeight * safeScale;
    return;
  }
  view.scale.set(safeScale);
}

export function toColorNumber(value, fallback = 0xffffff) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const expanded = hex
        .split("")
        .map((char) => char + char)
        .join("");
      return Number.parseInt(expanded, 16);
    }
    if (hex.length === 6) {
      return Number.parseInt(hex, 16);
    }
  }

  return fallback;
}

function createShapeView(config) {
  const view = new PIXI.Graphics();
  const color = toColorNumber(config.color, 0xffffff);
  const radius = Number(config.radius ?? 12);
  const size = Number(config.size ?? radius * 2);
  const width = Number(config.width ?? size);
  const height = Number(config.height ?? size);

  switch (config.shape) {
    case "triangle":
      view.poly([0, -size * 0.5, size * 0.5, size * 0.5, -size * 0.5, size * 0.5]).fill({ color, alpha: 1 });
      break;
    case "square":
      view.rect(-size * 0.5, -size * 0.5, size, size).fill({ color, alpha: 1 });
      break;
    case "rectangle":
      view.roundRect(-width * 0.5, -height * 0.5, width, height, Math.min(width, height) * 0.2).fill({
        color,
        alpha: 1,
      });
      break;
    case "circle":
    default:
      view.circle(0, 0, radius).fill({ color, alpha: 1 });
      break;
  }

  view.stroke({
    color: 0xffffff,
    alpha: 0.18,
    width: Math.max(1, Math.round(Math.max(size, width, height) * 0.08)),
  });
  return view;
}

function createSpriteView(config) {
  const texture = config.src ? PIXI.Assets.get(config.src) ?? PIXI.Texture.from(config.src) : PIXI.Texture.WHITE;
  const view = new PIXI.Sprite(texture);
  view.anchor.set(0.5);
  const baseSize = getSpriteDisplaySize(config, texture);
  view.__assetBaseWidth = baseSize.width;
  view.__assetBaseHeight = baseSize.height;
  applyEntityDisplayScale(view, 1);
  view.tint = config.src && config.tint == null ? 0xffffff : toColorNumber(config.tint ?? config.color, 0xffffff);
  return view;
}

function getSpriteDisplaySize(config, texture) {
  const textureWidth = Number(texture?.width ?? texture?.orig?.width ?? 0);
  const textureHeight = Number(texture?.height ?? texture?.orig?.height ?? 0);
  const hasTextureSize = textureWidth > 0 && textureHeight > 0;

  if (typeof config.width === "number" && typeof config.height === "number") {
    return {
      width: config.width,
      height: config.height,
    };
  }

  if (typeof config.width === "number" && hasTextureSize) {
    return {
      width: config.width,
      height: config.width * (textureHeight / textureWidth),
    };
  }

  if (typeof config.height === "number" && hasTextureSize) {
    return {
      width: config.height * (textureWidth / textureHeight),
      height: config.height,
    };
  }

  const targetSize = typeof config.size === "number" ? config.size : typeof config.radius === "number" ? config.radius * 2 : getEntityFootprint(config);
  if (hasTextureSize) {
    if (textureWidth >= textureHeight) {
      return {
        width: targetSize,
        height: targetSize * (textureHeight / textureWidth),
      };
    }
    return {
      width: targetSize * (textureWidth / textureHeight),
      height: targetSize,
    };
  }

  return {
    width: targetSize,
    height: targetSize,
  };
}

function normalizeAssetConfig(assetConfig) {
  const src =
    typeof assetConfig?.src === "string" && assetConfig.src.trim()
      ? assetConfig.src.trim()
      : typeof assetConfig?.url === "string" && assetConfig.url.trim()
        ? assetConfig.url.trim()
        : "";
  return {
    type: assetConfig?.type === "sprite" || src ? "sprite" : "shape",
    shape: String(assetConfig?.shape ?? "circle").toLowerCase(),
    color: assetConfig?.color ?? "#ffffff",
    tint: assetConfig?.tint,
    src,
    radius: typeof assetConfig?.radius === "number" ? assetConfig.radius : undefined,
    size: typeof assetConfig?.size === "number" ? assetConfig.size : undefined,
    width: typeof assetConfig?.width === "number" ? assetConfig.width : undefined,
    height: typeof assetConfig?.height === "number" ? assetConfig.height : undefined,
  };
}
