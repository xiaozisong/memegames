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

export function buildTileDefinitions() {
  const groups = new Map();
  for (const [key, value] of Object.entries(config)) {
    if (!isLeafEntry(value)) continue;
    let match = key.match(/^gameplay_tile_(\d+)_(id|name|asset|media|sound)$/);
    if (match) {
      const index = Number.parseInt(match[1], 10);
      const field = match[2];
      const record = groups.get(index) ?? {};
      record[field] = readEntryValue(value);
      groups.set(index, record);
      continue;
    }
    match = key.match(/^theme_tile_glow_(\d+)$/);
    if (match) {
      const index = Number.parseInt(match[1], 10);
      const record = groups.get(index) ?? {};
      record.glow = readEntryValue(value);
      groups.set(index, record);
    }
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, item], itemIndex) => {
      if (typeof item.id !== "string" || !item.id.trim()) return null;
      const id = item.id.trim();
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : id;
      const glow = typeof item.glow === "string" ? item.glow.trim() : "";
      const media = typeof item.media === "string" ? item.media.trim() : "";
      const asset = typeof item.asset === "string" ? item.asset.trim() : "";
      const resolvedAsset = media || buildFallbackTileSvgDataUri(id, name, glow, itemIndex);
      return {
        id,
        name,
        media,
        asset: resolvedAsset || asset,
        glow,
        sound: typeof item.sound === "string" ? item.sound.trim() : "",
      };
    })
    .filter(Boolean);
}

export function buildPrimaryGoal() {
  return {
    type: getSetting("gameplay_goal_primary_type", "collect"),
    tileId: getSetting("gameplay_goal_primary_tile_id", ""),
    target: Number(getSetting("gameplay_goal_primary_target", 0)),
  };
}

export function getSetting(path, fallback) {
  if (path === "gameplay_tile_definitions" || path === "gameplay.tileDefinitions") {
    const defs = buildTileDefinitions();
    if (defs.length > 0) return defs;
  }
  if (path === "gameplay_goal_primary" || path === "gameplay.goal.primary") {
    return buildPrimaryGoal();
  }
  const raw = getRawEntry(path);
  if (raw !== undefined) return readEntryValue(raw);
  return fallback;
}

export function getConfigEntry(path) {
  const raw = getRawEntry(path);
  return isLeafEntry(raw) ? raw : null;
}

export function isConfigPathEditable(path) {
  const normalized = String(path || "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("_")) return false;
  const last = normalized.split(".").filter(Boolean).at(-1);
  return Boolean(last) && !last.startsWith("_");
}

export function listConfigLeafPaths(source = config, basePath = "") {
  if (!source || typeof source !== "object") return [];
  if (isLeafEntry(source)) return basePath ? [basePath] : [];

  const paths = [];
  for (const [key, value] of Object.entries(source)) {
    if (!basePath && isLeafEntry(value)) {
      paths.push(key);
      continue;
    }
    const nextPath = basePath ? `${basePath}.${key}` : key;
    paths.push(...listConfigLeafPaths(value, nextPath));
  }
  return paths;
}

export function listEditableConfigPaths() {
  return listConfigLeafPaths().filter((path) => isConfigPathEditable(path));
}

function buildFallbackTileSvgDataUri(id, name, glow, itemIndex) {
  const palette = [
    { face: "#ffd76a", accent: "#ff9f43" },
    { face: "#7ee787", accent: "#2ecc71" },
    { face: "#7cc7ff", accent: "#3b82f6" },
    { face: "#ff8ec7", accent: "#ef5da8" },
    { face: "#d0b3ff", accent: "#8b5cf6" },
    { face: "#ffe08a", accent: "#f59e0b" },
  ];
  const paletteItem = palette[itemIndex % palette.length];
  const faceColor = paletteItem.face;
  const accentColor = paletteItem.accent;
  const glowColor = normalizeSvgColor(glow, accentColor);
  const expression = getFaceExpression(String(id || "").toLowerCase());
  const label = escapeSvgText(name || id || "tile");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="${faceColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="1"/>
    </radialGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="${glowColor}" flood-opacity="0.35"/>
    </filter>
  </defs>
  <circle cx="64" cy="64" r="50" fill="url(#bg)" filter="url(#shadow)"/>
  <circle cx="46" cy="50" r="6" fill="#1f1630"/>
  <circle cx="82" cy="50" r="6" fill="#1f1630"/>
  ${expression}
  <circle cx="44" cy="74" r="6" fill="#ff7ca8" opacity="0.38"/>
  <circle cx="84" cy="74" r="6" fill="#ff7ca8" opacity="0.38"/>
  <circle cx="64" cy="64" r="50" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="4"/>
  <title>${label}</title>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function getFaceExpression(id) {
  if (id.includes("angry")) {
    return `
  <path d="M36 42 L50 38" stroke="#1f1630" stroke-width="5" stroke-linecap="round"/>
  <path d="M78 38 L92 42" stroke="#1f1630" stroke-width="5" stroke-linecap="round"/>
  <path d="M44 84 Q64 70 84 84" fill="none" stroke="#1f1630" stroke-width="6" stroke-linecap="round"/>
`;
  }
  if (id.includes("sad")) {
    return `<path d="M42 86 Q64 66 86 86" fill="none" stroke="#1f1630" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (id.includes("laugh")) {
    return `
  <path d="M38 74 Q64 102 90 74" fill="#1f1630"/>
  <path d="M46 78 Q64 92 82 78" fill="#ffffff"/>
`;
  }
  if (id.includes("confused")) {
    return `
  <path d="M39 44 Q46 38 54 44" fill="none" stroke="#1f1630" stroke-width="5" stroke-linecap="round"/>
  <path d="M74 44 Q82 36 92 42" fill="none" stroke="#1f1630" stroke-width="5" stroke-linecap="round"/>
  <path d="M42 84 Q55 76 64 82 T86 80" fill="none" stroke="#1f1630" stroke-width="6" stroke-linecap="round"/>
`;
  }
  return `<path d="M40 78 Q64 96 88 78" fill="none" stroke="#1f1630" stroke-width="6" stroke-linecap="round"/>`;
}

function normalizeSvgColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb") || trimmed.startsWith("oklch(") || trimmed.startsWith("hsl")) {
    return trimmed;
  }
  return fallback;
}

function escapeSvgText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
