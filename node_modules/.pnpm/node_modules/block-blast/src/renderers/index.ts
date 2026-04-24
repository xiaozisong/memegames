import { RendererPlugin } from "./types";

export async function resolveRendererPlugin(id: string): Promise<RendererPlugin> {
  const _id = id; // keep configurable interface while using Pixi-only renderer.
  void _id;
  const mod = await import("./pixiRenderer");
  return mod.pixiRendererPlugin;
}
