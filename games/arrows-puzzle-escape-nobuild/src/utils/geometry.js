export function pointKey(x, y) {
  return `${x},${y}`;
}

export function clonePoint(point) {
  return point ? { x: point.x, y: point.y } : null;
}

export function pointsEqual(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

export function cellCenter(x, y, board) {
  const stride = Number(board.cellSize) + Number(board.gap);
  const half = Number(board.cellSize) * 0.5;
  return {
    x: x * stride + half,
    y: y * stride + half,
  };
}

export function boardPixelSize(board) {
  return {
    width: board.width * board.cellSize + Math.max(0, board.width - 1) * board.gap,
    height: board.height * board.cellSize + Math.max(0, board.height - 1) * board.gap,
  };
}

export function buildPolylinePoints(points, board) {
  return points
    .map((point) => {
      const center = cellCenter(point.x, point.y, board);
      return `${center.x},${center.y}`;
    })
    .join(" ");
}

export function buildPathD(points, board) {
  if (!Array.isArray(points) || points.length === 0) return "";
  return points
    .map((point, index) => {
      const center = cellCenter(point.x, point.y, board);
      return `${index === 0 ? "M" : "L"} ${center.x} ${center.y}`;
    })
    .join(" ");
}

export function buildBezierPath(points, board, tension = null) {
  if (!Array.isArray(points) || points.length === 0) return "";
  const centers = points.map((point) => cellCenter(point.x, point.y, board));
  if (centers.length === 1) {
    return `M ${centers[0].x} ${centers[0].y}`;
  }

  const baseTension = tension ?? board.cellSize * 0.4;
  let d = `M ${centers[0].x} ${centers[0].y}`;

  if (centers.length === 2) {
    const start = centers[0];
    const end = centers[1];
    const direction = normalizeVector({
      x: end.x - start.x,
      y: end.y - start.y,
    });
    const segmentLength = distanceBetween(start, end);
    const handle = Math.min(baseTension, segmentLength * 0.45);
    const cp1 = {
      x: start.x + direction.x * handle,
      y: start.y + direction.y * handle,
    };
    const cp2 = {
      x: end.x - direction.x * handle,
      y: end.y - direction.y * handle,
    };
    return `${d} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  }

  for (let index = 0; index < centers.length - 1; index += 1) {
    const start = centers[index];
    const end = centers[index + 1];
    const previous = centers[index - 1] || start;
    const next = centers[index + 2] || end;

    const incoming = normalizeVector({
      x: start.x - previous.x,
      y: start.y - previous.y,
    });
    const outgoing = normalizeVector({
      x: end.x - start.x,
      y: end.y - start.y,
    });
    const nextOutgoing = normalizeVector({
      x: next.x - end.x,
      y: next.y - end.y,
    });

    const startTangent = index === 0
      ? outgoing
      : normalizeTangent({
          x: incoming.x + outgoing.x,
          y: incoming.y + outgoing.y,
        }, outgoing);

    const endTangent = index === centers.length - 2
      ? outgoing
      : normalizeTangent({
          x: outgoing.x + nextOutgoing.x,
          y: outgoing.y + nextOutgoing.y,
        }, outgoing);

    const segmentLength = distanceBetween(start, end);
    const handle = Math.min(baseTension, segmentLength * 0.45);
    const cp1 = {
      x: start.x + startTangent.x * handle,
      y: start.y + startTangent.y * handle,
    };
    const cp2 = {
      x: end.x - endTangent.x * handle,
      y: end.y - endTangent.y * handle,
    };

    d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  }

  return d;
}

export function buildSmoothPath(points, board, tension = null) {
  return buildBezierPath(points, board, tension);
}

export function buildRoundedPathD(points, board, radius = null) {
  return buildSmoothPath(points, board, radius);
}

function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function normalizeTangent(vector, fallback) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.0001) {
    return fallback;
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
