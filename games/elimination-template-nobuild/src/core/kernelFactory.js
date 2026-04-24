import { getSetting } from "../config.js";
import { BlockBlastKernel } from "../kernels/blockBlastKernel.js";
import { createPlaceholderKernel } from "../kernels/placeholderKernel.js";

export function createKernel() {
  const kernelId = getSetting("gameplay_mechanics_active", "blockblast");
  if (kernelId === "blockblast") return new BlockBlastKernel();
  return createPlaceholderKernel(kernelId);
}
