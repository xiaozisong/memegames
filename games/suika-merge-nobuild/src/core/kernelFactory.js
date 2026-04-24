import { getSetting } from "../config.js";
import { SuikaKernel } from "../kernels/suikaKernel.js";
export function createKernel() {
    const mode = getSetting("gameplay_mode", "physics-merge");
    if (mode === "physics-merge")
        return new SuikaKernel();
    return new SuikaKernel();
}
