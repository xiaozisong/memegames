import { SnakeRenderer } from "./SnakeRenderer.js";

export async function mountSnakeRenderer(root, kernel) {
  const renderer = new SnakeRenderer(root, kernel);
  await renderer.mount();
  return renderer;
}
