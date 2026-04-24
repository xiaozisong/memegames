import { createKernel } from "./core/kernelFactory";
import { mountPixiTemplateRenderer } from "./renderers/pixiTemplateRenderer";
import "./styles/ui-layer.css";

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing #app container.");
  const kernel = createKernel();
  await mountPixiTemplateRenderer(root, kernel);
}

void bootstrap();
