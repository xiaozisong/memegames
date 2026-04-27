import { createKernel } from "./core/kernelFactory.js";
import { mountTowerDefenseRenderer } from "./renderers/mountTowerDefenseRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");

  const kernel = createKernel();
  await mountTowerDefenseRenderer(root, kernel);
}

void bootstrap();
