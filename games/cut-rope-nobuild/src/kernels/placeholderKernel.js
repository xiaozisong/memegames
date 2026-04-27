import { createOverlay } from "../core/contracts.js";

export function createPlaceholderKernel(kernelId = "unknown") {
  return {
    id: kernelId,
    subscribe(listener) {
      listener({
        title: "Unsupported Template",
        subtitle: "Current gameplay kernel is unavailable.",
        totalLevels: 1,
        world: { width: 1000, height: 1600 },
        colors: {},
        presentation: {},
        state: {
          started: false,
          isOver: true,
          didWin: false,
          message: `Kernel "${kernelId}" is not implemented.`,
          overlay: createOverlay("Unsupported Kernel", `Kernel "${kernelId}" is not implemented.`, "Reload"),
          level: { index: 1, total: 1, name: "Placeholder" },
          candy: null,
          ropes: [],
          stars: [],
          target: null,
          collectedStars: 0,
          totalStars: 0,
        },
      });
      return () => {};
    },
    dispatch() {},
    getSnapshot() {
      return {
        title: "Unsupported Template",
        subtitle: "Current gameplay kernel is unavailable.",
        totalLevels: 1,
        world: { width: 1000, height: 1600 },
        colors: {},
        presentation: {},
        state: {
          started: false,
          isOver: true,
          didWin: false,
          message: `Kernel "${kernelId}" is not implemented.`,
          overlay: createOverlay("Unsupported Kernel", `Kernel "${kernelId}" is not implemented.`, "Reload"),
          level: { index: 1, total: 1, name: "Placeholder" },
          candy: null,
          ropes: [],
          stars: [],
          target: null,
          collectedStars: 0,
          totalStars: 0,
        },
      };
    },
  };
}
