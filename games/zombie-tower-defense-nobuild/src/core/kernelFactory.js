import { getSetting } from "../config.js";
import { createPlaceholderKernel } from "../kernels/placeholderKernel.js";
import { TowerDefenseKernel } from "../kernels/towerDefenseKernel.js";

export function createKernel() {
  const kernelId = getSetting("gameplay_mechanics_active", "towerDefense");
  if (kernelId === "towerDefense") return new TowerDefenseKernel();
  return createPlaceholderKernel(kernelId);
}
