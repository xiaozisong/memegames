import rawConfig from "./config.json" with { type: "json" };

export const config = rawConfig;

function getByPath(source, path) {
  return String(path || "").split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return acc[key];
  }, source);
}

function isLeafEntry(value) {
  return Boolean(value && typeof value === "object" && "value" in value);
}

function camelToSnake(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function pathToFlatKey(path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .map((segment) => camelToSnake(segment))
    .join("_");
}

function getRawEntry(path) {
  const nested = getByPath(config, path);
  if (nested !== undefined) return nested;
  return config[pathToFlatKey(path)];
}

function readEntryValue(entry) {
  return isLeafEntry(entry) ? entry.value : entry;
}

export function getSetting(path, fallback) {
  if (path === "gameplay_levels" || path === "gameplay.levels") {
    const levels = buildLevels();
    if (levels.length > 0) return levels;
  }
  const raw = getRawEntry(path);
  if (raw !== undefined) return readEntryValue(raw);
  return fallback;
}

export function getConfigEntry(path) {
  const raw = getRawEntry(path);
  return isLeafEntry(raw) ? raw : null;
}

export function getPresentationAssets() {
  return buildAssetSet("presentation");
}

export function getPresentationAudio() {
  return buildAudioConfig("presentation");
}

export function buildLevels() {
  const declaredCount = Math.max(0, Number(getSetting("gameplay_level_count", 0)) || 0);
  const inferredCount = inferLevelCount();
  const totalLevels = Math.max(declaredCount, inferredCount);
  const levels = [];

  for (let levelIndex = 1; levelIndex <= totalLevels; levelIndex += 1) {
    const level = buildLevel(levelIndex);
    if (level) levels.push(level);
  }

  return levels;
}

function buildLevel(levelIndex) {
  const prefix = `gameplay_level_${levelIndex}`;
  const candy = {
    x: Number(getSetting(`${prefix}_candy_x`, 500)),
    y: Number(getSetting(`${prefix}_candy_y`, 280)),
  };
  const targetShape = String(getSetting(`${prefix}_target_shape`, "circle")).trim().toLowerCase();
  const ropes = buildRopesForLevel(levelIndex, candy);
  const stars = buildStarsForLevel(levelIndex);
  const target = {
    shape: targetShape === "rect" ? "rect" : "circle",
    x: Number(getSetting(`${prefix}_target_x`, 500)),
    y: Number(getSetting(`${prefix}_target_y`, 1300)),
    radius: Number(getSetting(`${prefix}_target_radius`, 88)),
    width: Number(getSetting(`${prefix}_target_width`, 180)),
    height: Number(getSetting(`${prefix}_target_height`, 140)),
  };

  return {
    id: `level-${levelIndex}`,
    index: levelIndex,
    name: String(getSetting(`${prefix}_name`, `Level ${levelIndex}`)),
    assets: buildAssetSet(prefix, getPresentationAssets()),
    audio: buildAudioConfig(prefix, getPresentationAudio()),
    candy,
    ropes,
    stars,
    target,
  };
}

function buildAssetSet(prefix, fallback = null) {
  return {
    background: buildAssetEntry(`${prefix}_background_asset_url`, fallback?.background),
    candy: buildAssetEntry(`${prefix}_candy_asset_url`, fallback?.candy),
    star: buildAssetEntry(`${prefix}_star_asset_url`, fallback?.star),
    target: buildAssetEntry(`${prefix}_target_asset_url`, fallback?.target),
  };
}

function buildAssetEntry(path, fallback = null) {
  const fallbackUrl = typeof fallback?.url === "string" ? fallback.url : "";
  return {
    url: normalizeAssetUrl(getSetting(path, fallbackUrl)),
  };
}

function buildAudioConfig(prefix, fallback = null) {
  return {
    bgmUrl: normalizeAssetUrl(getSetting(`${prefix}_bgm_asset_url`, fallback?.bgmUrl ?? "")),
    bgmVolume: clampNumber(getSetting(`${prefix}_bgm_volume`, fallback?.bgmVolume ?? 0.5), 0, 1, 0.5),
    bgmLoop: parseBooleanSetting(getSetting(`${prefix}_bgm_loop`, fallback?.bgmLoop ?? true), true),
  };
}

function buildRopesForLevel(levelIndex, candy) {
  const prefix = `gameplay_level_${levelIndex}_rope_`;
  const groups = new Map();

  for (const [key, entry] of Object.entries(config)) {
    if (!isLeafEntry(entry) || !key.startsWith(prefix)) continue;
    const match = key.match(new RegExp(`^gameplay_level_${levelIndex}_rope_(\\d+)_(anchor_x|anchor_y|length)$`));
    if (!match) continue;
    const ropeIndex = Number.parseInt(match[1], 10);
    const field = match[2];
    const record = groups.get(ropeIndex) ?? {};
    record[field] = readEntryValue(entry);
    groups.set(ropeIndex, record);
  }

  const ropes = Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ropeIndex, item]) => {
      const anchorX = Number(item.anchor_x ?? candy.x);
      const anchorY = Number(item.anchor_y ?? Math.max(0, candy.y - 180));
      const defaultLength = Math.hypot(candy.x - anchorX, candy.y - anchorY);
      return {
        id: `level-${levelIndex}-rope-${ropeIndex}`,
        anchor: { x: anchorX, y: anchorY },
        length: Number(item.length ?? defaultLength),
      };
    });

  if (ropes.length > 0) return ropes;

  return [
    {
      id: `level-${levelIndex}-rope-1`,
      anchor: { x: candy.x, y: Math.max(0, candy.y - 180) },
      length: 180,
    },
  ];
}

function buildStarsForLevel(levelIndex) {
  const groups = new Map();

  for (const [key, entry] of Object.entries(config)) {
    if (!isLeafEntry(entry)) continue;
    const match = key.match(new RegExp(`^gameplay_level_${levelIndex}_star_(\\d+)_(x|y)$`));
    if (!match) continue;
    const starIndex = Number.parseInt(match[1], 10);
    const field = match[2];
    const record = groups.get(starIndex) ?? {};
    record[field] = readEntryValue(entry);
    groups.set(starIndex, record);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([starIndex, item]) => ({
      id: `level-${levelIndex}-star-${starIndex}`,
      x: Number(item.x ?? 0),
      y: Number(item.y ?? 0),
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
}

function inferLevelCount() {
  let maxLevelIndex = 0;
  for (const key of Object.keys(config)) {
    const match = key.match(/^gameplay_level_(\d+)_/);
    if (!match) continue;
    maxLevelIndex = Math.max(maxLevelIndex, Number.parseInt(match[1], 10));
  }
  return maxLevelIndex;
}

function normalizeAssetUrl(value) {
  return String(value ?? "").trim();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseBooleanSetting(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}
