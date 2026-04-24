import { createKernel } from "./core/kernelFactory.js";
import { mountGame2048Renderer } from "./renderers/game2048/mountGame2048Renderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountGame2048Renderer(root, kernel);
}

void bootstrap();
