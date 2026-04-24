import { createOverlay } from "../core/contracts.js";

export function createPlaceholderKernel(kernelId) {
  const listeners = [];
  const snapshot = {
    rows: 0,
    cols: 0,
    targetScore: 0,
    moveLimit: 0,
    bagSize: 0,
    scoreIcon: "⚠",
    ctaText: "UNSUPPORTED",
    title: "Unsupported Mode",
    subtitle: `Kernel '${kernelId}' is not implemented in no-build template.`,
    colors: {
      bgTop: "#111827",
      bgBottom: "#1f2937",
      panel: "rgba(255,255,255,0.08)",
      boardBg: "#0f172a",
      gridLine: "#334155",
      textPrimary: "#e5e7eb",
      textAccent: "#f59e0b",
      iconColor: "#f59e0b",
      highlight: "#f59e0b",
      shadow: "#000000",
    },
    state: {
      board: [],
      bag: [],
      selectedPieceIndex: null,
      score: 0,
      movesUsed: 0,
      gemProgress: {},
      message: "No kernel loaded.",
      started: false,
      isOver: true,
      didWin: false,
      overlay: createOverlay("Unsupported", `Kernel '${kernelId}' is missing.`, "OK"),
    },
    gemTargets: [],
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
