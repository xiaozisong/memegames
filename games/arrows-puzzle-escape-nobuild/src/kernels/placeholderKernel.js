import { createOverlay } from "../core/contracts.js";

export function createPlaceholderKernel(kernelId) {
  return {
    id: String(kernelId || "unknown"),
    subscribe(listener) {
      listener(this.getSnapshot());
      return () => {};
    },
    dispatch() {},
    getSnapshot() {
      return {
        title: "Unavailable Kernel",
        subtitle: "当前玩法没有注册到内核工厂。",
        colors: {
          background: "#0b1020",
          panel: "#11192f",
          panelBorder: "#233355",
          textPrimary: "#f4f7fb",
          textSecondary: "#a9b8d1",
          accent: "#7c8cff",
          danger: "#ff6b81",
          success: "#5de2a5",
          boardBase: "#111a31",
          boardGrid: "#2a385f",
          arrow: "#7c8cff",
          wall: "#4a587c",
          goal: "#ffcf5c",
          path: "#8ef9d2",
          pathGlow: "#6fd6ff",
        },
        presentation: {},
        level: {
          width: 0,
          height: 0,
          label: "Unavailable",
          description: "",
          solution: null,
        },
        state: {
          grid: [],
          currentPath: [],
          isRunning: false,
          didWin: false,
          attempts: 0,
          message: `Kernel "${String(kernelId || "unknown")}" not found.`,
          lastResult: null,
          overlay: createOverlay("Unavailable", "当前玩法没有可运行内核。", "刷新"),
          effects: {
            tick: 0,
            run: null,
          },
        },
      };
    },
  };
}
