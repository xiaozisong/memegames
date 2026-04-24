import rawConfig from "./config.json" with { type: "json" };

export const config = rawConfig;

const GROUP_ALIASES = {
  "presentation.animation": {
    clear: "presentation_animation_clear",
    place: "presentation_animation_place",
  },
  "presentation.interaction": {
    dragPreview: "presentation_interaction_drag_preview",
    highlightValid: "presentation_interaction_highlight_valid",
  },
};

function getByPath(source, path) {
  return path.split(".").reduce((acc, key) => {
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
  if (isLeafEntry(entry)) return entry.value;
  return entry;
}

function buildGroupValue(path) {
  const schema = GROUP_ALIASES[path];
  if (!schema) return undefined;

  const output = {};
  let hasAny = false;
  for (const [propName, flatKey] of Object.entries(schema)) {
    const entry = config[flatKey];
    if (entry === undefined) continue;
    output[propName] = readEntryValue(entry);
    hasAny = true;
  }
  return hasAny ? output : undefined;
}

export function buildThemePieceColors() {
  const fromSplit = Object.entries(config)
    .filter(([key, value]) => /^theme_piece_color_\d+$/.test(key) && isLeafEntry(value))
    .sort((a, b) => {
      const aIndex = Number.parseInt(a[0].match(/\d+$/)?.[0] ?? "0", 10);
      const bIndex = Number.parseInt(b[0].match(/\d+$/)?.[0] ?? "0", 10);
      return aIndex - bIndex;
    })
    .map(([, value]) => readEntryValue(value))
    .filter((value) => typeof value === "string" && value.trim());

  if (fromSplit.length > 0) return fromSplit;

  const legacy = getRawEntry("theme.pieceColors");
  if (legacy !== undefined) {
    const values = readEntryValue(legacy);
    if (Array.isArray(values)) return values;
  }
  return undefined;
}

export function buildInitialBoardFilledCells() {
  const groups = new Map();
  for (const [key, value] of Object.entries(config)) {
    const match = key.match(/^gameplay_initial_board_cell_(\d+)_(row|col|color|gem_type)$/);
    if (!match || !isLeafEntry(value)) continue;
    const index = Number.parseInt(match[1], 10);
    const field = match[2];
    const record = groups.get(index) ?? {};
    record[field] = readEntryValue(value);
    groups.set(index, record);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, item]) => {
      if (!Number.isFinite(item.row) || !Number.isFinite(item.col)) return null;
      return {
        row: Number(item.row),
        col: Number(item.col),
        color: typeof item.color === "string" && item.color.trim() ? item.color : undefined,
        gemType: typeof item.gem_type === "string" && item.gem_type.trim() ? item.gem_type.trim() : undefined,
      };
    })
    .filter(Boolean);
}

export function buildShapePool() {
  return Object.entries(config)
    .filter(([key, value]) => /^gameplay_shape_\d+$/.test(key) && isLeafEntry(value))
    .sort((a, b) => {
      const aIndex = Number.parseInt(a[0].match(/\d+$/)?.[0] ?? "0", 10);
      const bIndex = Number.parseInt(b[0].match(/\d+$/)?.[0] ?? "0", 10);
      return aIndex - bIndex;
    })
    .map(([, value]) => readEntryValue(value))
    .filter((value) => typeof value === "string" && value.trim());
}

export function buildGemTargets() {
  const groups = new Map();
  for (const [key, value] of Object.entries(config)) {
    const match = key.match(/^gameplay_gem_target_(\d+)_(type|count)$/);
    if (!match || !isLeafEntry(value)) continue;
    const index = Number.parseInt(match[1], 10);
    const field = match[2];
    const record = groups.get(index) ?? {};
    record[field] = readEntryValue(value);
    groups.set(index, record);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, item]) => {
      if (typeof item.type !== "string" || !item.type.trim()) return null;
      return {
        type: item.type.trim(),
        count: Number(item.count ?? 0),
      };
    })
    .filter(Boolean);
}

export function getSetting(path, fallback) {
  if (path === "theme.pieceColors" || path === "theme_piece_colors") {
    const pieceColors = buildThemePieceColors();
    if (pieceColors !== undefined) return pieceColors;
  }

  if (path === "gameplay.initialBoard.filledCells" || path === "gameplay_initial_board_filled_cells") {
    return buildInitialBoardFilledCells();
  }

  if (path === "gameplay.shapes" || path === "gameplay_shapes") {
    return buildShapePool();
  }

  if (path === "gameplay.gemTargets" || path === "gameplay_gem_targets") {
    return buildGemTargets();
  }

  const raw = getRawEntry(path);
  if (raw !== undefined) return readEntryValue(raw);

  const grouped = buildGroupValue(path);
  if (grouped !== undefined) return grouped;

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

  const parts = normalized.split(".").filter(Boolean);
  const last = parts.at(-1);
  if (!last) return false;
  return !last.startsWith("_");
}

export function listConfigLeafPaths(source = config, basePath = "") {
  if (!source || typeof source !== "object") return [];
  if (isLeafEntry(source)) return basePath ? [basePath] : [];

  const entries = Object.entries(source);
  const paths = [];
  for (const [key, value] of entries) {
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

export function getBackgroundMediaSettings() {
  const url = getSetting("theme_background_media", getSetting("theme_background_video", ""));
  const type = getSetting("theme_background_media_type", "auto");
  return { url, type };
}
