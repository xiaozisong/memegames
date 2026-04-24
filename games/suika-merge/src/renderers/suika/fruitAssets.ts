import * as PIXI from "pixi.js";

export type FruitTextureMap = Map<string, PIXI.Texture>;
export type AssetProgressCallback = (completed: number, total: number) => void;

function resolveAssetUrl(url: string): string {
  return new URL(url, window.location.href).toString();
}

export async function preloadTextures(
  assetMap: Record<string, string>,
  onProgress?: AssetProgressCallback,
): Promise<Map<string, PIXI.Texture>> {
  const textures = new Map<string, PIXI.Texture>();
  const entries = Object.entries(assetMap ?? {}).filter(([, url]) => typeof url === "string" && url.length > 0);
  const total = entries.length;
  let completed = 0;
  if (total === 0) return textures;
  await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const texture = await PIXI.Assets.load(resolveAssetUrl(url));
        if (texture) textures.set(key, texture as PIXI.Texture);
      } catch {
        // Ignore missing asset errors; renderer handles empty texture fallback.
      } finally {
        completed += 1;
        onProgress?.(completed, total);
      }
    }),
  );
  return textures;
}

export async function loadFruitTextures(
  assetMap: Record<string, string>,
  onProgress?: AssetProgressCallback,
): Promise<FruitTextureMap> {
  return preloadTextures(assetMap, onProgress);
}
