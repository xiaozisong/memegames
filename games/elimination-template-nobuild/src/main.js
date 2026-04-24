import { createKernel } from "./core/kernelFactory.js";
import { mountBlockPlacementRenderer } from "./renderers/blockPlacement/mountBlockPlacementRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountBlockPlacementRenderer(root, kernel);
}

void bootstrap();
