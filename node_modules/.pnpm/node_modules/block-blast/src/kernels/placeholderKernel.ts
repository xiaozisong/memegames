import { EliminationSnapshot, GameKernel, KernelAction, KernelListener } from "../core/contracts";

export function createPlaceholderKernel(id: string): GameKernel {
  const snapshot: EliminationSnapshot = {
    rows: 6,
    cols: 6,
    targetScore: 1,
    moveLimit: 0,
    bagSize: 0,
    scoreIcon: "🧪",
    ctaText: "KERNEL MISSING",
    title: "Block Blast",
    subtitle: `Kernel "${id}" is not implemented yet`,
    colors: {
      bgTop: "#334155",
      bgBottom: "#475569",
      panel: "rgba(255,255,255,0.12)",
      boardBg: "#1e293b",
      gridLine: "rgba(255,255,255,0.08)",
      textPrimary: "#ffffff",
      textAccent: "#facc15",
      iconColor: "#cbd5e1",
      highlight: "rgba(255,255,255,0.2)",
      shadow: "rgba(0,0,0,0.24)"
    },
    state: {
      board: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => ({ filled: false, color: "#1e293b", gemId: null }))),
      bag: [],
      selectedPieceIndex: null,
      score: 0,
      movesUsed: 0,
      gemProgress: {},
      message: "Implement the selected kernel in src/kernels.",
      started: false,
      isOver: true,
      didWin: false,
      overlay: {
        visible: true,
        title: "Kernel Placeholder",
        body: `No kernel for "${id}". Add implementation and register in kernelFactory.`,
        buttonText: "OK"
      }
    },
    gemTargets: []
  };

  const listeners: KernelListener[] = [];
  return {
    id,
    subscribe(listener: KernelListener) {
      listeners.push(listener);
      listener(snapshot);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    dispatch(_action: KernelAction) {},
    getSnapshot() {
      return snapshot;
    }
  };
}
