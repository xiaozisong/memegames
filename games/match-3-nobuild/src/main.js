import { createKernel } from "./core/kernelFactory.js";
import { mountMatch3Renderer } from "./renderers/match3/mountMatch3Renderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountMatch3Renderer(root, kernel);
}

void bootstrap();
