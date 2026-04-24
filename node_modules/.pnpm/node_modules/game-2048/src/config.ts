import { getConfig } from "@game/core";

export function getSetting<T>(path: string, fallback: T): T {
  const value = getConfig(path);
  return (value ?? fallback) as T;
}
