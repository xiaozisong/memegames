import * as PIXI from "pixi.js";
function resolveAssetUrl(url) {
    return new URL(url, window.location.href).toString();
}
export async function preloadTextures(assetMap, onProgress) {
    const textures = new Map();
    const entries = Object.entries(assetMap ?? {}).filter(([, url]) => typeof url === "string" && url.length > 0);
    const total = entries.length;
    let completed = 0;
    if (total === 0)
        return textures;
    await Promise.all(entries.map(async ([key, url]) => {
        try {
            const texture = await PIXI.Assets.load(resolveAssetUrl(url));
            if (texture)
                textures.set(key, texture);
        }
        catch {
            // Ignore missing asset errors; renderer handles empty texture fallback.
        }
        finally {
            completed += 1;
            onProgress?.(completed, total);
        }
    }));
    return textures;
}
export async function loadFruitTextures(assetMap, onProgress) {
    return preloadTextures(assetMap, onProgress);
}
