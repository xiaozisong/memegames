import { getSetting } from "../config";
import { GameKernel } from "./contracts";
import { Game2048Kernel } from "../kernels/game2048Kernel";

export function createKernel(): GameKernel {
  const mode = getSetting("gameplay.mode", "classic-2048");
  if (mode === "classic-2048") return new Game2048Kernel();
  return new Game2048Kernel();
}
