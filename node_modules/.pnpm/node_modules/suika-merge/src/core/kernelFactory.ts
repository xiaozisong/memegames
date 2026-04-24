import { getSetting } from "../config";
import { GameKernel } from "./contracts";
import { SuikaKernel } from "../kernels/suikaKernel";

export function createKernel(): GameKernel {
  const mode = getSetting<string>("gameplay.mode", "physics-merge");
  if (mode === "physics-merge") return new SuikaKernel();
  return new SuikaKernel();
}
