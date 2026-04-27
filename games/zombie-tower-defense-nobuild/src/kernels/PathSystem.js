export function createPathRuntime(points) {
  const normalizedPoints = Array.isArray(points)
    ? points
        .map((point) => ({
          x: Number(point?.x ?? 0),
          y: Number(point?.y ?? 0),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];

  const safePoints = normalizedPoints.length >= 2 ? normalizedPoints : [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const segments = [];
  let totalLength = 0;

  for (let index = 1; index < safePoints.length; index += 1) {
    const from = safePoints[index - 1];
    const to = safePoints[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length <= 0) continue;
    segments.push({
      from,
      to,
      dx,
      dy,
      length,
      startDistance: totalLength,
      endDistance: totalLength + length,
    });
    totalLength += length;
  }

  return {
    points: safePoints,
    segments,
    totalLength,
  };
}

export function getPositionOnPath(pathRuntime, distance) {
  const safeRuntime = pathRuntime ?? createPathRuntime([]);
  const safeDistance = clamp(distance, 0, safeRuntime.totalLength);

  if (safeRuntime.segments.length === 0) {
    const point = safeRuntime.points[0] ?? { x: 0, y: 0 };
    return { x: point.x, y: point.y };
  }

  const segment =
    safeRuntime.segments.find((item) => safeDistance >= item.startDistance && safeDistance <= item.endDistance) ??
    safeRuntime.segments.at(-1);

  if (!segment) {
    const point = safeRuntime.points.at(-1) ?? { x: 0, y: 0 };
    return { x: point.x, y: point.y };
  }

  const segmentDistance = safeDistance - segment.startDistance;
  const progress = segment.length <= 0 ? 0 : segmentDistance / segment.length;
  return {
    x: segment.from.x + segment.dx * progress,
    y: segment.from.y + segment.dy * progress,
  };
}

export function getPathEndPoint(pathRuntime) {
  const point = pathRuntime?.points?.at(-1) ?? { x: 0, y: 0 };
  return { x: point.x, y: point.y };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
