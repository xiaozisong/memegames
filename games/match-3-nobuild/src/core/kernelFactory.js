import { getSetting } from "../config.js";
import { Match3Kernel } from "../kernels/match3Kernel.js";
import { createPlaceholderKernel } from "../kernels/placeholderKernel.js";

export function createKernel() {
  const kernelId = getSetting("gameplay_mechanics_active", "match3");
  if (kernelId === "match3") return new Match3Kernel();
  return createPlaceholderKernel(kernelId);
}
