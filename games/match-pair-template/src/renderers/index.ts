import { RendererPlugin } from "./types";

export async function resolveRendererPlugin(id: string): Promise<RendererPlugin> {
  if (id === "pixi") {
    const mod = await import("./pixiRenderer");
    return mod.pixiRendererPlugin;
  }
  if (id === "three") {
    const mod = await import("./threeRenderer");
    return mod.threeRendererPlugin;
  }
  const mod = await import("./domRenderer");
  return mod.domRendererPlugin;
}
