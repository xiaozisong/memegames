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

function snakeToCamel(value) {
  return String(value)
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function pathToFlatKey(path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .map((segment) => camelToSnake(segment))
    .join("_");
}

function synthesizeSection(path) {
  const prefix = pathToFlatKey(path);
  if (!prefix) return undefined;
  const section = {};
  let found = false;

  for (const [key, value] of Object.entries(config)) {
    if (!key.startsWith(`${prefix}_`)) continue;
    const sectionKey = key.slice(prefix.length + 1);
    if (!sectionKey) continue;
    section[snakeToCamel(sectionKey)] = readEntryValue(value);
    found = true;
  }

  return found ? section : undefined;
}

function getRawEntry(path) {
  const nested = getByPath(config, path);
  if (nested !== undefined) return nested;
  const flat = config[pathToFlatKey(path)];
  if (flat !== undefined) return flat;
  return synthesizeSection(path);
}

function readEntryValue(entry) {
  return isLeafEntry(entry) ? entry.value : entry;
}

export function getSetting(path, fallback) {
  const raw = getRawEntry(path);
  if (raw !== undefined) return readEntryValue(raw);
  return fallback;
}

export function getConfigEntry(path) {
  const raw = getRawEntry(path);
  return isLeafEntry(raw) ? raw : null;
}
