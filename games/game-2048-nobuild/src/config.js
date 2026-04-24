import rawConfig from "./config.json" with { type: "json" };

export const config = rawConfig;

function unwrapValue(raw) {
  if (raw && typeof raw === "object" && "value" in raw) {
    return raw.value;
  }
  return raw;
}

function toSnake(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function resolvePathToFlatKey(path) {
  if (path.startsWith("gameplay.params.")) {
    return `gameplay_${toSnake(path.slice("gameplay.params.".length))}`;
  }
  if (path === "gameplay.mode") return "gameplay_mode";
  if (path.startsWith("ui.text.")) {
    return `ui_text_${toSnake(path.slice("ui.text.".length))}`;
  }
  if (path.startsWith("theme.tiles.")) {
    return `theme_tile_${path.slice("theme.tiles.".length)}`;
  }
  if (path.startsWith("theme.modal.")) {
    return `theme_modal_${toSnake(path.slice("theme.modal.".length))}`;
  }
  if (path.startsWith("theme.controls.")) {
    return `theme_controls_${toSnake(path.slice("theme.controls.".length))}`;
  }
  if (path.startsWith("theme.")) {
    return `theme_${toSnake(path.slice("theme.".length))}`;
  }
  if (path.startsWith("plugins.pixi.")) {
    return `plugin_pixi_${toSnake(path.slice("plugins.pixi.".length))}`;
  }
  return path;
}

export function isConfigKeyEditable(key) {
  return typeof key === "string" && !key.startsWith("_");
}

export function getSetting(path, fallback) {
  const direct = unwrapValue(config[path]);
  if (direct !== undefined) return direct;
  const flatKey = resolvePathToFlatKey(path);
  const mapped = unwrapValue(config[flatKey]);
  return mapped ?? fallback;
}
