import { createKernel } from "./core/kernelFactory.js";
import { SvgGameRenderer } from "./renderers/SvgGameRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  const renderer = new SvgGameRenderer(root, kernel);
  await renderer.mount();
}

void bootstrap();
