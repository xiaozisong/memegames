let currentConfig: unknown;

type Dict = Record<string, unknown>;

function isObject(value: unknown): value is Dict {
  return typeof value === "object" && value !== null;
}

function unwrapValueNode(value: unknown): unknown {
  if (isObject(value) && "value" in value) {
    return (value as Dict).value;
  }
  return value;
}

export function setConfig(config: unknown): void {
  currentConfig = config;
}

export function getConfig(path: string): unknown {
  let cursor: unknown = currentConfig;

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
