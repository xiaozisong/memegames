import { createKernel } from "./core/kernelFactory.js";
import { mountDOMRenderer } from "./renderers/dom/mountDOMRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountDOMRenderer(root, kernel);
}

void bootstrap();
