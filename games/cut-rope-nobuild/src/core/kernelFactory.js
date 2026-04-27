import { getSetting } from "../config.js";
import { CutRopeKernel } from "../kernels/cutRopeKernel.js";
import { createPlaceholderKernel } from "../kernels/placeholderKernel.js";

export function createKernel() {
  const kernelId = getSetting("gameplay_mechanics_active", "cut_rope");
  if (kernelId === "cut_rope") return new CutRopeKernel();
  return createPlaceholderKernel(kernelId);
}
