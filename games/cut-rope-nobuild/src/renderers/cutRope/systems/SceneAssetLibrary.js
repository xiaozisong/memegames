import * as PIXI from "pixi.js";

export class SceneAssetLibrary {
  constructor() {
    this.textures = new Map();
    this.pending = new Map();
    this.failed = new Set();
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  preloadFromSnapshot(snapshot) {
    const urls = [
      pickSceneAssetUrl(snapshot, "background"),
      pickSceneAssetUrl(snapshot, "candy"),
      pickSceneAssetUrl(snapshot, "star"),
      pickSceneAssetUrl(snapshot, "target"),
    ].filter(Boolean);

    for (const url of urls) {
      this.ensureTexture(url);
    }
  }

  getTexture(url) {
    const normalizedUrl = normalizeAssetUrl(url);
    if (!normalizedUrl) return null;
    return this.textures.get(normalizedUrl) ?? null;
  }

  ensureTexture(url) {
    const normalizedUrl = normalizeAssetUrl(url);
    if (!normalizedUrl || this.textures.has(normalizedUrl) || this.failed.has(normalizedUrl) || this.pending.has(normalizedUrl)) {
      return;
    }

    const task = PIXI.Assets.load(normalizedUrl)
      .then((resource) => {
        const texture = toTexture(resource, normalizedUrl);
        if (!texture) {
          this.failed.add(normalizedUrl);
          return;
        }
        this.textures.set(normalizedUrl, texture);
        this.emitLoaded();
      })
      .catch(() => {
        this.failed.add(normalizedUrl);
      })
      .finally(() => {
        this.pending.delete(normalizedUrl);
      });

    this.pending.set(normalizedUrl, task);
  }

  emitLoaded() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function pickSceneAssetUrl(snapshot, key) {
  const levelUrl = normalizeAssetUrl(snapshot?.state?.level?.assets?.[key]?.url);
  if (levelUrl) return levelUrl;
  return normalizeAssetUrl(snapshot?.presentation?.assets?.[key]?.url);
}

function toTexture(resource, url) {
  if (resource instanceof PIXI.Texture) {
    return resource;
  }
  if (resource?.texture instanceof PIXI.Texture) {
    return resource.texture;
  }

  try {
    const texture = PIXI.Texture.from(url);
    return texture instanceof PIXI.Texture ? texture : null;
  } catch {
    return null;
  }
}

function normalizeAssetUrl(value) {
  return String(value ?? "").trim();
}
