import { getSetting } from "./config";
import { BlockBlastEngine } from "./blockBlastEngine";
import { resolveRendererPlugin } from "./renderers";

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing #app container.");

  const rendererId = getSetting<string>("presentation.renderer.active", "dom");
  const renderer = await resolveRendererPlugin(rendererId);
  const engine = new BlockBlastEngine();
  const handle = await renderer.mount({ root, engine });
  engine.subscribe((snapshot) => {
    handle.render(snapshot);
  });
}

void bootstrap();
