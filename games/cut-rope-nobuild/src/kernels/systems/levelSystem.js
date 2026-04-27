export function getLevelByIndex(levels, levelIndex) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const normalizedIndex = clampIndex(levelIndex, levels.length);
  return levels[normalizedIndex - 1] ?? levels[0];
}

export function createLevelState(level, options = {}) {
  const candyRadius = Number(options.candyRadius ?? 40);
  const starRadius = Number(options.starRadius ?? 24);
  const worldWidth = Math.max(1, Number(options.worldWidth ?? 1000));
  const worldHeight = Math.max(1, Number(options.worldHeight ?? 1600));
  if (!level) {
    return {
      level: {
        id: "level-1",
        index: 1,
        name: "Level 1",
        assets: createAssetState(),
        audio: createAudioState(),
      },
      candy: null,
      ropes: [],
      stars: [],
      target: null,
      collectedStars: 0,
      totalStars: 0,
    };
  }

  const initialCandy = {
    x: Number(level.candy?.x ?? 500),
    y: Number(level.candy?.y ?? 280),
  };

  const ropes = (level.ropes ?? []).map((rope, index) => ({
    id: rope.id ?? `${level.id}-rope-${index + 1}`,
    anchor: {
      x: Number(rope.anchor?.x ?? initialCandy.x),
      y: Number(rope.anchor?.y ?? Math.max(0, initialCandy.y - 180)),
    },
    length: Number(rope.length ?? Math.hypot(initialCandy.x - (rope.anchor?.x ?? initialCandy.x), initialCandy.y - (rope.anchor?.y ?? initialCandy.y - 180))),
    active: true,
  }));

  const stabilizedCandy = stabilizeCandySpawn(initialCandy, ropes, {
    radius: candyRadius,
    worldWidth,
    worldHeight,
  });

  const candy = {
    x: stabilizedCandy.x,
    y: stabilizedCandy.y,
    vx: 0,
    vy: 0,
    radius: candyRadius,
    rotation: 0,
    angularVelocity: 0,
  };

  const stars = (level.stars ?? []).map((star, index) => ({
    id: star.id ?? `${level.id}-star-${index + 1}`,
    x: Number(star.x ?? 0),
    y: Number(star.y ?? 0),
    radius: starRadius,
    collected: false,
  }));

  const target = {
    shape: level.target?.shape === "rect" ? "rect" : "circle",
    x: Number(level.target?.x ?? 500),
    y: Number(level.target?.y ?? 1320),
    radius: Number(level.target?.radius ?? 90),
    width: Number(level.target?.width ?? 180),
    height: Number(level.target?.height ?? 140),
  };

  return {
    level: {
      id: level.id ?? `level-${level.index ?? 1}`,
      index: Number(level.index ?? 1),
      name: String(level.name ?? `Level ${level.index ?? 1}`),
      assets: createAssetState(level.assets),
      audio: createAudioState(level.audio),
    },
    candy,
    ropes,
    stars,
    target,
    collectedStars: 0,
    totalStars: stars.length,
  };
}

export function getActiveRopes(ropes) {
  return (ropes ?? []).filter((rope) => rope?.active);
}

function createAssetState(assets = {}) {
  return {
    background: { url: normalizeAssetUrl(assets.background?.url) },
    candy: { url: normalizeAssetUrl(assets.candy?.url) },
    star: { url: normalizeAssetUrl(assets.star?.url) },
    target: { url: normalizeAssetUrl(assets.target?.url) },
  };
}

function createAudioState(audio = {}) {
  return {
    bgmUrl: normalizeAssetUrl(audio.bgmUrl),
    bgmVolume: clampNumber(audio.bgmVolume, 0, 1, 0.5),
    bgmLoop: typeof audio.bgmLoop === "boolean" ? audio.bgmLoop : true,
  };
}

function clampIndex(levelIndex, totalLevels) {
  const parsed = Number(levelIndex || 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(totalLevels, Math.round(parsed)));
}

function normalizeAssetUrl(value) {
  return String(value ?? "").trim();
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function stabilizeCandySpawn(initialCandy, ropes, options) {
  const radius = Number(options.radius ?? 40);
  const worldWidth = Math.max(1, Number(options.worldWidth ?? 1000));
  const worldHeight = Math.max(1, Number(options.worldHeight ?? 1600));
  const horizontalPadding = radius + 56;
  const topPadding = radius + 72;
  const bottomPadding = Math.min(worldHeight * 0.45, radius + 260);
  const anchorCount = Math.max(1, ropes.length);
  const averageAnchorX = ropes.reduce((sum, rope) => sum + Number(rope.anchor?.x ?? initialCandy.x), 0) / anchorCount;
  const averageHangY =
    ropes.reduce((sum, rope) => sum + Number(rope.anchor?.y ?? initialCandy.y - 180) + Number(rope.length ?? 180), 0) / anchorCount;

  let x = lerp(Number(initialCandy.x ?? averageAnchorX), averageAnchorX, ropes.length > 0 ? 0.72 : 0);
  let y = lerp(Number(initialCandy.y ?? averageHangY), averageHangY, ropes.length > 0 ? 0.2 : 0);

  x = clampNumber(x, horizontalPadding, worldWidth - horizontalPadding, averageAnchorX);
  y = clampNumber(y, topPadding, worldHeight - bottomPadding, averageHangY);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (const rope of ropes) {
      const anchorX = Number(rope.anchor?.x ?? x);
      const anchorY = Number(rope.anchor?.y ?? y - 180);
      const maxLength = Math.max(radius * 1.5, Number(rope.length ?? 180));
      const dx = x - anchorX;
      const dy = y - anchorY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const targetLength = Math.min(distance, maxLength * 0.92);
      x = anchorX + (dx / distance) * targetLength;
      y = anchorY + (dy / distance) * targetLength;
    }

    x = clampNumber(x, horizontalPadding, worldWidth - horizontalPadding, averageAnchorX);
    y = clampNumber(y, topPadding, worldHeight - bottomPadding, averageHangY);
  }

  return { x, y };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}
