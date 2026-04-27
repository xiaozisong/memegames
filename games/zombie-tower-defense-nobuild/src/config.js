import rawConfig from "./config.json" with { type: "json" };

export const config = rawConfig;

export function clone(value) {
  return structuredClone(value);
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

function readEntryValue(entry) {
  return isLeafEntry(entry) ? entry.value : entry;
}

function getRawEntry(path) {
  const direct = config[path];
  if (direct !== undefined) return direct;
  return config[pathToFlatKey(path)];
}

export function getSetting(path, fallback) {
  const raw = getRawEntry(path);
  if (raw !== undefined) return readEntryValue(raw);
  return fallback;
}

export function getAssetConfig(name) {
  return buildObject(`assets.${name}`, ["type", "shape", "color", "tint", "radius", "size", "width", "height", "src"]);
}

export function getPathPoints() {
  return clone(getSetting("path_points", []));
}

export function getTowerDefinitions() {
  return clone(getSetting("towers", []));
}

export function getWaveDefinitions() {
  return clone(getSetting("waves", []));
}

export function getTowerSlotDefinitions() {
  return clone(getSetting("tower_slots", []));
}

export function getTowerConfig() {
  return buildObject("tower", [
    "purchaseCost",
    "maxLevel",
    "baseDamage",
    "damageStep",
    "baseRange",
    "rangeStep",
    "baseFireRateMs",
    "fireRateStepMs",
    "minFireRateMs",
    "upgradeBaseCost",
    "upgradeCostStep",
  ]);
}

export function getBaseConfig() {
  return buildObject("base", ["maxLevel", "x", "y", "startGold", "goldPerSecond", "goldRateUpgradeStep", "upgradeBaseCost", "upgradeCostStep"]);
}

export function getSubBaseConfig() {
  return buildObject("subBase", ["x", "y", "maxHp", "regenPerSecond", "regenDelayMs"]);
}

export function getBulletConfig() {
  return buildObject("bullet", ["speed"]);
}

export function getEnemyConfig() {
  return {
    baseHp: Number(getSetting("enemy_base_hp", 40)),
    baseSpeed: Number(getSetting("enemy_base_speed", 68)),
    touchDamage: Number(getSetting("enemy_touch_damage", 1)),
    rewardGold: Number(getSetting("enemy_reward_gold", 0)),
    attackIntervalMs: Number(getSetting("enemy_attack_interval_ms", 1000)),
    types: {
      level1: buildObject("enemy.types.level1", ["assetKey", "hpMultiplier", "damageMultiplier", "speedMultiplier", "rewardMultiplier", "sizeMultiplier", "label"]),
      level2: buildObject("enemy.types.level2", ["assetKey", "hpMultiplier", "damageMultiplier", "speedMultiplier", "rewardMultiplier", "sizeMultiplier", "label"]),
      level3: buildObject("enemy.types.level3", ["assetKey", "hpMultiplier", "damageMultiplier", "speedMultiplier", "rewardMultiplier", "sizeMultiplier", "label"]),
      boss: buildObject("enemy.types.boss", ["assetKey", "hpMultiplier", "damageMultiplier", "speedMultiplier", "rewardMultiplier", "sizeMultiplier", "label"]),
    },
  };
}

export function getAudioConfig() {
  return {
    bgm: buildObject("audio.bgm", ["src", "volume", "loop"]),
    hit: buildObject("audio.hit", ["src", "volume"]),
    attack: buildObject("audio.attack", ["src", "volume"]),
  };
}

export function getOverlayConfig() {
  return {
    intro: buildObject("overlay.intro", ["title", "body", "buttonText"]),
    defeat: buildObject("overlay.defeat", ["title", "body", "buttonText"]),
    victory: buildObject("overlay.victory", ["title", "body", "buttonText"]),
    ui: buildObject("overlay.ui", ["titleFontSize", "bodyFontSize", "buttonFontSize"]),
  };
}

function buildObject(prefix, fields) {
  const result = {};
  for (const field of fields) {
    const value = getSetting(`${prefix}.${field}`, undefined);
    if (value !== undefined) {
      result[field] = clone(value);
    }
  }
  return result;
}
