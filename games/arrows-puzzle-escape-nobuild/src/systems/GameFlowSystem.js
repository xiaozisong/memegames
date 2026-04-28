export class GameFlowSystem {
  constructor(layerSystem, occupancySystem, blockSystem, uiConfig = {}) {
    this.layerSystem = layerSystem;
    this.occupancySystem = occupancySystem;
    this.blockSystem = blockSystem;
    this.uiConfig = uiConfig;
  }

  buildDerivedData(board, worms = []) {
    const layeredWorms = this.layerSystem.sortWorms(worms);
    const occupancy = this.occupancySystem.build(board, layeredWorms);
    const blockedIds = this.blockSystem.collectBlockedIds(layeredWorms, occupancy);
    const remainingCount = layeredWorms.filter((worm) => !worm.removed).length;

    return {
      occupancy,
      blockedIds,
      remainingCount,
      worms: layeredWorms,
    };
  }

  createRemovalRun(worm, board) {
    const displayPath = Array.isArray(worm.displayPath) ? worm.displayPath : [];
    const segments = [];
    for (let index = 1; index < displayPath.length; index += 1) {
      segments.push({
        from: { ...displayPath[index - 1] },
        to: { ...displayPath[index] },
        result: "segment",
      });
    }
    return {
      id: `remove-${worm.id}-${Date.now()}`,
      wormId: worm.id,
      path: worm.path.map((point) => ({ ...point })),
      displayPath: displayPath.map((point) => ({ ...point })),
      start: worm.start ? { ...worm.start } : displayPath[0] ? { ...displayPath[0] } : null,
      activeCell: worm.start ? { ...worm.start } : displayPath[0] ? { ...displayPath[0] } : null,
      visited: worm.path.map((point) => `${point.x},${point.y}`),
      segments,
      durationMs: Math.max(300, Math.min(500, (board.stepDurationMs || 210) + Math.max(120, displayPath.length * 32))),
      mode: "remove",
    };
  }

  resolveClick(worm, derivedData) {
    if (!worm || worm.removed) {
      return { type: "ignore" };
    }
    if (derivedData.blockedIds.has(worm.id)) {
      return { type: "blocked", wormId: worm.id };
    }
    return { type: "remove", wormId: worm.id };
  }

  removeWorm(worms = [], wormId) {
    return worms.map((worm) => {
      if (worm.id !== wormId) return worm;
      return {
        ...worm,
        removed: true,
      };
    });
  }

  isSolved(derivedData) {
    return derivedData.remainingCount === 0;
  }

  createIdleMessage(derivedData) {
    if (derivedData.remainingCount === 0) {
      return this.uiConfig.statusSuccess || "所有虫子都已消除。";
    }
    return this.uiConfig.statusIdle || "选择最上层虫子开始。";
  }
}
