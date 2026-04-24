import { getSetting } from "../config";
import { GameKernel } from "./contracts";
import { BlockBlastKernel } from "../kernels/blockBlastKernel";
import { createPlaceholderKernel } from "../kernels/placeholderKernel";

export function createKernel(): GameKernel {
  const kernelId = getSetting<string>("gameplay.mechanics.active", "blockblast");
  if (kernelId === "blockblast") return new BlockBlastKernel();
  return createPlaceholderKernel(kernelId);
}
