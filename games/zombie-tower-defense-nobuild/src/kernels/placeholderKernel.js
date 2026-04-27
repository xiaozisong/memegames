import { createOverlay } from "../core/contracts.js";

export function createPlaceholderKernel(kernelId) {
  const listeners = [];
  const snapshot = {
    title: "Unsupported Mode",
    subtitle: `Kernel '${kernelId}' is not implemented.`,
    world: {
      width: 1280,
      height: 720,
      backgroundColor: "#020617",
      gridColor: "#0f172a",
      pathColor: "#334155",
      pathBorderColor: "#94a3b8",
      pathWidth: 72,
      accentColor: "#38bdf8",
      dangerColor: "#fb7185",
    },
    path: [],
    assets: {},
    waves: {
      current: 0,
      total: 0,
      remainingInWave: 0,
      totalSpawned: 0,
      totalToSpawn: 0,
    },
    state: {
      started: false,
      isOver: true,
      didWin: false,
      message: "No kernel loaded.",
      overlay: createOverlay("Unsupported", `Kernel '${kernelId}' is missing.`, "OK"),
      enemies: [],
      towers: [],
      bullets: [],
      base: { x: 0, y: 0, hp: 0, maxHp: 0, leaks: 0 },
      kills: 0,
      timeMs: 0,
    },
  };

  return {
    id: kernelId,
    subscribe(listener) {
      listeners.push(listener);
      listener(snapshot);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    dispatch() {},
    getSnapshot() {
      return snapshot;
    },
  };
}
