export class WormSystem {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
    this.wormsById = new Map();
    this.wormIdsByStart = new Map();
  }

  createWorms(board, levelConfig = {}, theme = {}) {
    const worms = [];
    this.wormsById.clear();
    this.wormIdsByStart.clear();

    const wormDefs = Array.isArray(levelConfig.worms) ? levelConfig.worms : [];
    for (const wormDef of wormDefs) {
      const path = this.normalizePath(wormDef?.path, board);
      if (path.length < 3) {
        throw new Error(`Worm "${wormDef?.id || "unknown"}" must define at least 3 path points.`);
      }

      const start = { ...path[0] };
      const worm = {
        id: typeof wormDef?.id === "string" && wormDef.id ? wormDef.id : `worm-${start.x}-${start.y}`,
        start,
        path: path.map((point) => ({ ...point })),
        displayPath: path.map((point) => ({ ...point })),
        headCell: this.resolveHeadCell(path, start.x, start.y),
        color: typeof wormDef?.color === "string" && wormDef.color
          ? wormDef.color
          : this.resolveColor(null, wormDef?.zIndex || 0, theme),
        zIndex: Number.isFinite(wormDef?.zIndex) ? Number(wormDef.zIndex) : 0,
        removed: false,
        status: "idle",
        endReason: null,
      };
      worms.push(worm);
      this.wormsById.set(worm.id, worm);
      this.wormIdsByStart.set(this.pointKey(start.x, start.y), worm.id);
    }

    return worms;
  }

  cloneWorms(worms = []) {
    return worms.map((worm) => ({
      ...worm,
      start: worm.start ? { ...worm.start } : null,
      path: Array.isArray(worm.path) ? worm.path.map((point) => ({ ...point })) : [],
      displayPath: Array.isArray(worm.displayPath) ? worm.displayPath.map((point) => ({ ...point })) : [],
      headCell: worm.headCell ? { ...worm.headCell } : null,
    }));
  }

  getWormById(wormId) {
    return wormId ? this.wormsById.get(wormId) ?? null : null;
  }

  getWormIdForStart(point) {
    if (!point) return null;
    return this.wormIdsByStart.get(this.pointKey(point.x, point.y)) ?? null;
  }

  resolveColor(run, index, theme) {
    const palette = [
      theme.primary || "#52e3ff",
      theme.warning || "#ffd166",
      theme.success || "#39ff88",
      "#9c89ff",
    ];
    if (run?.status === "success") {
      return theme.primary || "#52e3ff";
    }
    return palette[index % palette.length];
  }

  pointKey(x, y) {
    return `${x},${y}`;
  }

  resolveHeadCell(path = [], fallbackX, fallbackY) {
    if (Array.isArray(path) && path.length > 0) {
      return { ...path[0] };
    }
    return Number.isInteger(fallbackX) && Number.isInteger(fallbackY)
      ? { x: fallbackX, y: fallbackY }
      : null;
  }

  normalizePath(path, board) {
    if (!Array.isArray(path)) return [];
    return path
      .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Number(point.x),
        y: Number(point.y),
      }))
      .filter((point) => this.gridSystem.inBounds(board, point.x, point.y));
  }
}
