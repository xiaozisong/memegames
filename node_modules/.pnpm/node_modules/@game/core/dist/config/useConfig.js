let currentConfig;
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function unwrapValueNode(value) {
    if (isObject(value) && "value" in value) {
        return value.value;
    }
    return value;
}
export function setConfig(config) {
    currentConfig = config;
}
export function getConfig(path) {
    let cursor = currentConfig;
    if (!path) {
        return unwrapValueNode(cursor);
    }
    const keys = path.split(".").filter(Boolean);
    for (const key of keys) {
        cursor = unwrapValueNode(cursor);
        if (!isObject(cursor) || !(key in cursor)) {
            return undefined;
        }
        cursor = cursor[key];
    }
    return unwrapValueNode(cursor);
}
