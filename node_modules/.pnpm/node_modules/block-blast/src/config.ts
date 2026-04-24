import rawConfig from "./config.json";

export const config = rawConfig;

function getByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

export function getSetting<T>(path: string, fallback: T): T {
  const raw = getByPath(config, path);
  if (raw && typeof raw === "object" && "value" in (raw as Record<string, unknown>)) {
    return (raw as { value: T }).value;
  }
  return (raw as T | undefined) ?? fallback;
}
