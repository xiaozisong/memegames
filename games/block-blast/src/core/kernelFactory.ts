import { getSetting } from "../config";
import { GameKernel } from "./contracts";
import { BlockBlastKernel } from "../kernels/blockBlastKernel";
import { BlockPlacementKernel } from "../kernels/blockPlacementKernel";
import { createPlaceholderKernel } from "../kernels/placeholderKernel";

export function createKernel(): GameKernel {
  const kernelId = getSetting<string>(
    "gameplay.mode",
    getSetting<string>("gameplay.mechanics.active", "block-placement"),
  );
  if (kernelId === "block-placement") return new BlockPlacementKernel();
  if (kernelId === "blockblast") return new BlockBlastKernel();
  return createPlaceholderKernel(kernelId);
}
