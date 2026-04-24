import { createOverlay } from "../core/contracts.js";

export function createPlaceholderKernel(kernelId) {
  const listeners = [];
  const snapshot = {
    rows: 0,
    cols: 0,
    title: "Unsupported Mode",
    subtitle: `Kernel '${kernelId}' is not implemented.`,
    colors: {
      bgTop: "oklch(0.152 0.032 275.8)",
      bgBottom: "oklch(0.169 0.056 290.8)",
      boardBg: "oklch(0.195 0.061 268.9)",
      boardAlpha: 0.82,
      gridLine: "oklch(0.438 0.057 249.8)",
      panelBg: "oklch(0.220 0.045 268.0)",
      panelAlpha: 0.72,
      primary: "oklch(0.756 0.147 235.2)",
      accent: "oklch(0.621 0.221 290.0)",
      textPrimary: "oklch(0.930 0.020 255.0)",
      textSecondary: "oklch(0.820 0.030 255.0)",
      buttonBg: "oklch(0.756 0.147 235.2)",
      buttonText: "oklch(0.985 0.000 0.0)",
    },
    state: {
      board: [],
      score: 0,
      movesUsed: 0,
      started: false,
      isOver: true,
      didWin: false,
      message: "No kernel loaded.",
      overlay: createOverlay("Unsupported", `Kernel '${kernelId}' is missing.`, "OK"),
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
