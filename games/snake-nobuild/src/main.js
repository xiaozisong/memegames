import { createKernel } from "./core/kernelFactory.js";
import { mountSnakeRenderer } from "./renderers/snake/mountSnakeRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountSnakeRenderer(root, kernel);
}

void bootstrap();
