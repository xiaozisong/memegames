import { createKernel } from "./core/kernelFactory.js";
import { mountCutRopeRenderer } from "./renderers/cutRope/mountCutRopeRenderer.js";

async function bootstrap() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountCutRopeRenderer(root, kernel);
}

void bootstrap();
