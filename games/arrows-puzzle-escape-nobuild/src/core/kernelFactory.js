import { getSetting } from "../config.js";
import { ArrowsPuzzleKernel } from "../kernels/arrowsPuzzleKernel.js";
import { createPlaceholderKernel } from "../kernels/placeholderKernel.js";

export function createKernel() {
  const kernelId = getSetting("game.id", "arrows-puzzle");
  if (kernelId === "arrows-puzzle") return new ArrowsPuzzleKernel();
  return createPlaceholderKernel(kernelId);
}
