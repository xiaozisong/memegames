import { createKernel } from "./core/kernelFactory";
import { mountPixiTemplateRenderer } from "./renderers/pixiTemplateRenderer";
import "./styles/ui-layer.css";
import "./styles/meme-match.css";
import { getSetting } from "./config";
import { Match3Kernel } from "./kernels/match3Kernel";
import { mountMemeMatchRenderer } from "./renderers/memeMatch3/mountMemeMatchRenderer";

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing #app container.");
  const active = getSetting<string>("gameplay.mechanics.active", "blockblast");
  if (active === "match3") {
    const kernel = new Match3Kernel();
    await mountMemeMatchRenderer(root, kernel);
    return;
  }
  const kernel = createKernel();
  await mountPixiTemplateRenderer(root, kernel);
}

void bootstrap();
