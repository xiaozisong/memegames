import { MechanicPlugin } from "../types";
import { blockBlastPlugin } from "./blockblast";
import { match3Plugin } from "./match3";
import { merge2Plugin } from "./merge2";

export function getPlugins(): Record<string, MechanicPlugin> {
  return {
    match3: match3Plugin,
    blockblast: blockBlastPlugin,
    merge2: merge2Plugin
  };
}
