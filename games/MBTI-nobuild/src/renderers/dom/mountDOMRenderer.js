import { DOMRenderer } from "./DOMRenderer.js";

export async function mountDOMRenderer(root, kernel) {
  const renderer = new DOMRenderer(root, kernel);
  await renderer.mount();
  return renderer;
}
