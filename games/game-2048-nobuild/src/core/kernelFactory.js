import { getSetting } from "../config.js";
import { Game2048Kernel } from "../kernels/game2048Kernel.js";

export function createKernel() {
  const mode = getSetting("gameplay.mode", "classic-2048");
  if (mode === "classic-2048") return new Game2048Kernel();
  return new Game2048Kernel();
}
