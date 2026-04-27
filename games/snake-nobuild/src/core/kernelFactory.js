import { getSetting } from "../config.js";
import { SnakeKernel } from "../kernels/snakeKernel.js";

export function createKernel() {
  const mode = getSetting("gameplay.mode", "slither-snake");
  if (mode === "slither-snake") return new SnakeKernel();
  return new SnakeKernel();
}
