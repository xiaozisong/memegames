const CARDINAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export class LevelGeneratorSystem {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  createRuntimeLevel(baseLevelConfig = {}, boardConfig = {}, theme = {}, levelNumber = 1, totalLevels = 10) {
    const width = Number(boardConfig.width || 0);
    const height = Number(boardConfig.height || 0);
    const wormCount = this.resolveWormCount(baseLevelConfig, levelNumber);
    const worms = this.generateRandomWorms(width, height, wormCount, baseLevelConfig, theme, levelNumber);

    return {
      id: `level-${levelNumber}`,
      name: `第${levelNumber}关`,
      description: `本关需要解锁 ${wormCount} 只虫虫。关卡越高，虫阵越密，弯曲越复杂。`,
      solution: {
        path: [],
        explanation: "先移除上层虫子，被覆盖的身体段会阻挡当前虫子。",
      },
      successTitle: levelNumber >= totalLevels ? "全部通关" : `第${levelNumber}关完成`,
      successBody: levelNumber >= totalLevels
        ? "你已经完成全部 10 关，点击按钮可重新开始随机虫阵。"
        : `准备进入第${levelNumber + 1}关，下一关会有更多需要解锁的虫虫。`,
      successButtonText: levelNumber >= totalLevels ? "重新开始" : "下一关",
      worms,
      cells: this.gridSystem.createEmptyCells(width, height),
    };
  }

  resolveWormCount(levelConfig, levelNumber) {
    const baseCount = Number(levelConfig.baseWormCount || 8);
    const increment = Number(levelConfig.wormCountStep || 2);
    const maxCount = Number(levelConfig.maxWormCount || 28);
    return Math.min(maxCount, baseCount + Math.max(0, levelNumber - 1) * increment);
  }

  generateRandomWorms(width, height, wormCount, levelConfig, theme, levelNumber) {
    const worms = [];
    const occupiedCounts = new Map();
    const zoneUsage = new Map();
    const rowUsage = Array.from({ length: height }, () => 0);
    const colUsage = Array.from({ length: width }, () => 0);
    const quadrantUsage = new Map([
      ["lt", 0],
      ["rt", 0],
      ["lb", 0],
      ["rb", 0],
    ]);
    const minPoints = Number(levelConfig.minPathPoints || 5);
    const maxPoints = Number(levelConfig.maxPathPoints || 10);
    const spreadPhaseCount = Math.max(1, Math.ceil(wormCount * 0.65));
    const quadrantTarget = Math.max(1, Math.floor(spreadPhaseCount / 4));

    for (let index = 0; index < wormCount; index += 1) {
      const spreadPhase = index < spreadPhaseCount;
      const start = this.pickStartPoint({
        width,
        height,
        occupiedCounts,
        zoneUsage,
        rowUsage,
        colUsage,
        quadrantUsage,
        quadrantTarget,
        preferOverlap: !spreadPhase,
      });
      const path = this.generateSinglePath({
        width,
        height,
        minPoints,
        maxPoints,
        occupiedCounts,
        zoneUsage,
        rowUsage,
        colUsage,
        quadrantUsage,
        levelNumber,
        wormIndex: index,
        spreadPhase,
        start,
      });

      const worm = {
        id: `worm-l${levelNumber}-${index + 1}`,
        color: this.createColor(index, theme),
        zIndex: index + 1,
        path,
      };
      worms.push(worm);
      const startQuadrant = this.getQuadrantKey(start.x, start.y, width, height);
      quadrantUsage.set(startQuadrant, (quadrantUsage.get(startQuadrant) || 0) + 1);

      for (const point of path) {
        const key = `${point.x},${point.y}`;
        occupiedCounts.set(key, (occupiedCounts.get(key) || 0) + 1);
        const zoneKey = this.getZoneKey(point.x, point.y, width, height);
        zoneUsage.set(zoneKey, (zoneUsage.get(zoneKey) || 0) + 1);
        rowUsage[point.y] += 1;
        colUsage[point.x] += 1;
      }
    }

    return worms;
  }

  generateSinglePath({ width, height, minPoints, maxPoints, occupiedCounts, zoneUsage, rowUsage, colUsage, quadrantUsage, levelNumber, wormIndex, spreadPhase, start }) {
    const attemptLimit = 180;
    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const targetLength = randomInt(minPoints, maxPoints);
      const desiredOverlaps = spreadPhase
        ? 0
        : (wormIndex === 0 ? 0 : randomInt(1, Math.min(4, 1 + Math.floor(levelNumber / 3))));

      const path = [start];
      const visited = new Set([`${start.x},${start.y}`]);
      let overlaps = occupiedCounts.has(`${start.x},${start.y}`) ? 1 : 0;

      while (path.length < targetLength) {
        const previous = path[path.length - 2] || null;
        const current = path[path.length - 1];
        const previousDirection = previous
          ? { x: current.x - previous.x, y: current.y - previous.y }
          : null;
        const candidates = CARDINAL_DIRECTIONS
          .map((direction) => ({ x: current.x + direction.x, y: current.y + direction.y, direction }))
          .filter((candidate) => this.gridSystem.inBounds({ width, height }, candidate.x, candidate.y))
          .filter((candidate) => !visited.has(`${candidate.x},${candidate.y}`));

        if (!candidates.length) break;

        const weighted = candidates.map((candidate) => {
          const key = `${candidate.x},${candidate.y}`;
          const isOverlap = occupiedCounts.has(key);
          const isBend = previousDirection
            ? candidate.direction.x !== previousDirection.x || candidate.direction.y !== previousDirection.y
            : false;
          const localDensity = this.getLocalDensity(candidate.x, candidate.y, occupiedCounts);
          const zoneLoad = zoneUsage.get(this.getZoneKey(candidate.x, candidate.y, width, height)) || 0;
          const rowLoad = rowUsage[candidate.y] || 0;
          const colLoad = colUsage[candidate.x] || 0;
          const quadrantLoad = quadrantUsage.get(this.getQuadrantKey(candidate.x, candidate.y, width, height)) || 0;
          let score = 1 + Math.random() * 0.8;
          if (isBend) score += 2.4;
          if (previousDirection && !isBend) score += 0.15;
          if (spreadPhase && isOverlap) score -= 3.8;
          if (!spreadPhase && isOverlap && overlaps < desiredOverlaps) score += 2.6;
          if (!spreadPhase && isOverlap && overlaps >= desiredOverlaps) score += 0.2;
          if (!spreadPhase && !isOverlap) score += 0.35;
          score -= localDensity * (spreadPhase ? 1.45 : 0.55);
          score -= zoneLoad * (spreadPhase ? 0.16 : 0.05);
          score -= rowLoad * (spreadPhase ? 0.1 : 0.04);
          score -= colLoad * (spreadPhase ? 0.1 : 0.04);
          score -= quadrantLoad * (spreadPhase ? 0.2 : 0.05);
          score += this.getVerticalBalanceBonus(candidate.y, height, rowUsage, spreadPhase);
          score += this.getHorizontalBalanceBonus(candidate.x, width, colUsage, spreadPhase);
          score += this.getEdgeSpreadBonus(candidate.x, candidate.y, width, height, spreadPhase);
          return { candidate, score };
        });

        const next = weightedRandom(weighted)?.candidate;
        if (!next) break;

        path.push({ x: next.x, y: next.y });
        visited.add(`${next.x},${next.y}`);
        if (occupiedCounts.has(`${next.x},${next.y}`)) {
          overlaps += 1;
        }
      }

      if (path.length >= 3 && overlaps >= Math.min(desiredOverlaps, Math.max(0, path.length - 3))) {
        return path;
      }
    }

    return this.createFallbackPath(width, height, minPoints, wormIndex, start);
  }

  pickStartPoint({ width, height, occupiedCounts, zoneUsage, rowUsage, colUsage, quadrantUsage, quadrantTarget, preferOverlap }) {
    const candidates = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const key = `${x},${y}`;
        const isOverlap = occupiedCounts.has(key);
        const localDensity = this.getLocalDensity(x, y, occupiedCounts);
        const zoneLoad = zoneUsage.get(this.getZoneKey(x, y, width, height)) || 0;
        const rowLoad = rowUsage[y] || 0;
        const colLoad = colUsage[x] || 0;
        const quadrantKey = this.getQuadrantKey(x, y, width, height);
        const quadrantLoad = quadrantUsage.get(quadrantKey) || 0;
        const needsQuadrantCoverage = quadrantLoad < quadrantTarget;
        let score = 1;
        if (preferOverlap) {
          score += isOverlap ? 2.2 : 0.3;
          score -= localDensity * 0.5;
          score -= rowLoad * 0.03;
          score -= colLoad * 0.03;
          score -= quadrantLoad * 0.04;
        } else {
          score += isOverlap ? -4.5 : 2.8;
          score -= localDensity * 1.8;
          score -= zoneLoad * 0.5;
          score -= rowLoad * 0.12;
          score -= colLoad * 0.12;
          score -= quadrantLoad * 0.22;
          if (needsQuadrantCoverage) score += 3.8;
          score += this.getVerticalBalanceBonus(y, height, rowUsage, true);
          score += this.getHorizontalBalanceBonus(x, width, colUsage, true);
          score += this.getEdgeSpreadBonus(x, y, width, height, true);
        }
        candidates.push({ candidate: { x, y }, score });
      }
    }
    return weightedRandom(candidates)?.candidate || { x: randomInt(0, width - 1), y: randomInt(0, height - 1) };
  }

  createFallbackPath(width, height, minPoints, wormIndex, start = null) {
    const length = Math.max(3, minPoints);
    const startX = start ? start.x : randomInt(0, Math.max(0, width - 3));
    const startY = start ? start.y : randomInt(0, Math.max(0, height - 3));
    const horizontalFirst = wormIndex % 2 === 0;
    const horizontalStep = Math.random() < 0.5 ? -1 : 1;
    const verticalStep = Math.random() < 0.5 ? -1 : 1;
    const path = [{ x: startX, y: startY }];

    for (let index = 1; index < length; index += 1) {
      const previous = path[path.length - 1];
      const step = horizontalFirst
        ? (index % 2 === 1 ? { x: horizontalStep, y: 0 } : { x: 0, y: verticalStep })
        : (index % 2 === 1 ? { x: 0, y: verticalStep } : { x: horizontalStep, y: 0 });
      path.push({
        x: clamp(previous.x + step.x, 0, width - 1),
        y: clamp(previous.y + step.y, 0, height - 1),
      });
    }

    return dedupeSequential(path);
  }

  createColor(index, theme) {
    const palette = [
      "#ff6b6b",
      "#ffd166",
      "#7bd389",
      "#5aa9e6",
      "#c77dff",
      "#ff8fab",
      "#4ecdc4",
      "#f4a261",
      theme.primary || "#35d6ff",
      theme.success || "#39ff88",
    ];
    return palette[index % palette.length];
  }

  getLocalDensity(x, y, occupiedCounts) {
    let density = 0;
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        density += occupiedCounts.get(`${x + offsetX},${y + offsetY}`) || 0;
      }
    }
    return density;
  }

  getZoneKey(x, y, width, height) {
    const zoneCols = Math.max(2, Math.min(4, Math.round(width / 3)));
    const zoneRows = Math.max(2, Math.min(5, Math.round(height / 3)));
    const zoneX = Math.min(zoneCols - 1, Math.floor((x / Math.max(1, width)) * zoneCols));
    const zoneY = Math.min(zoneRows - 1, Math.floor((y / Math.max(1, height)) * zoneRows));
    return `${zoneX},${zoneY}`;
  }

  getQuadrantKey(x, y, width, height) {
    const left = x < width / 2;
    const top = y < height / 2;
    if (left && top) return "lt";
    if (!left && top) return "rt";
    if (left && !top) return "lb";
    return "rb";
  }

  getEdgeSpreadBonus(x, y, width, height, spreadPhase) {
    if (!spreadPhase) return 0;
    const normalizedX = width <= 1 ? 0 : x / (width - 1);
    const normalizedY = height <= 1 ? 0 : y / (height - 1);
    const edgeDistance = Math.min(normalizedX, 1 - normalizedX, normalizedY, 1 - normalizedY);
    return edgeDistance < 0.22 ? 1.35 : edgeDistance < 0.34 ? 0.55 : 0;
  }

  getVerticalBalanceBonus(y, height, rowUsage, spreadPhase) {
    if (!spreadPhase || height <= 1) return 0;
    const half = height / 2;
    const topLoad = sum(rowUsage.slice(0, Math.floor(half)));
    const bottomLoad = sum(rowUsage.slice(Math.floor(half)));
    const preferTop = topLoad > bottomLoad;
    if (preferTop && y < half) return 0;
    if (!preferTop && y >= half) return 0;
    return 1.15;
  }

  getHorizontalBalanceBonus(x, width, colUsage, spreadPhase) {
    if (!spreadPhase || width <= 1) return 0;
    const half = width / 2;
    const leftLoad = sum(colUsage.slice(0, Math.floor(half)));
    const rightLoad = sum(colUsage.slice(Math.floor(half)));
    const preferLeft = leftLoad > rightLoad;
    if (preferLeft && x < half) return 0;
    if (!preferLeft && x >= half) return 0;
    return 0.9;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0.001, item.score), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(0.001, item.score);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function sum(values = []) {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dedupeSequential(path) {
  const deduped = [];
  for (const point of path) {
    const last = deduped[deduped.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) {
      deduped.push(point);
    }
  }
  return deduped;
}
