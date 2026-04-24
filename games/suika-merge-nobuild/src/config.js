import rawConfig from "./config.json" with { type: "json" };
export const config = rawConfig;

function unwrapValue(raw) {
    if (raw && typeof raw === "object" && "value" in raw) {
        return raw.value;
    }
    return raw;
}

export function getSetting(key, fallback) {
    if (!(key in config))
        return fallback;
    const value = unwrapValue(config[key]);
    return value ?? fallback;
}

function sortFruitType(left, right) {
    const [leftNum, rightNum] = [left, right].map((name) => {
        const match = name.match(/^fruit(\d+)$/i);
        return match ? Number(match[1]) : Number.NaN;
    });
    const leftIsNum = Number.isFinite(leftNum);
    const rightIsNum = Number.isFinite(rightNum);
    if (leftIsNum && rightIsNum)
        return leftNum - rightNum;
    if (leftIsNum)
        return -1;
    if (rightIsNum)
        return 1;
    return left.localeCompare(right);
}

function resolveFruitTypes() {
    const types = new Set();
    for (const key of Object.keys(config)) {
        const match = key.match(/^gameplay_(fruit[^_]+)_radius$/);
        if (match)
            types.add(match[1]);
    }
    const fallback = ["fruit1", "fruit2", "fruit3", "fruit4", "fruit5", "fruit6", "fruitBoss"];
    return (types.size > 0 ? Array.from(types) : fallback).sort(sortFruitType);
}

function buildFruitTypes() {
    const types = resolveFruitTypes();
    return types.map((type, index) => ({
        type,
        radius: Number(getSetting(`gameplay_${type}_radius`, 16 + index * 6)),
        color: String(getSetting(`gameplay_${type}_color`, "#ffffff")),
        score: Number(getSetting(`gameplay_${type}_score`, 10 + index * 25)),
    }));
}

function buildMergeRules() {
    const types = resolveFruitTypes();
    const rules = [];
    for (let i = 0; i < types.length - 1; i += 1) {
        const from = types[i];
        const fallbackTo = types[i + 1];
        const to = String(getSetting(`gameplay_merge_to_${from}`, fallbackTo));
        rules.push({ from, to });
    }
    return rules;
}

function buildSpawnWeights() {
    const result = {};
    for (const key of Object.keys(config)) {
        const match = key.match(/^gameplay_spawn_weight_(.+)$/);
        if (!match)
            continue;
        result[match[1]] = Number(getSetting(key, 0));
    }
    return result;
}

function buildAssetMap(prefix) {
    const result = {};
    for (const key of Object.keys(config)) {
        if (!key.startsWith(prefix))
            continue;
        const assetKey = key.slice(prefix.length);
        result[assetKey] = String(getSetting(key, ""));
    }
    return result;
}

export function isConfigKeyEditable(key) {
    return typeof key === "string" && !key.startsWith("_");
}

export function getSpawnXRange(fallback = [56, 334]) {
    const [fallbackMin, fallbackMax] = fallback;
    return [
        Number(getSetting("gameplay_spawn_x_min", fallbackMin)),
        Number(getSetting("gameplay_spawn_x_max", fallbackMax)),
    ];
}

export { buildSpawnWeights, buildFruitTypes, buildMergeRules, buildAssetMap };
