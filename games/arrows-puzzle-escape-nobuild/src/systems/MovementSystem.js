import { pointKey } from "../utils/geometry.js";
import { getDirection } from "../utils/directions.js";

export class MovementSystem {
  constructor(gridSystem, arrowSystem) {
    this.gridSystem = gridSystem;
    this.arrowSystem = arrowSystem;
  }

  buildRun(board, startPoint) {
    const startCell = this.gridSystem.getCell(board, startPoint?.x, startPoint?.y);
    if (!startCell || startCell.type !== "arrow") {
      return this.createResult(startPoint, "failed", "invalid-start", [], []);
    }

    const path = [{ x: startPoint.x, y: startPoint.y }];
    const segments = [];
    const visited = new Set([pointKey(startPoint.x, startPoint.y)]);
    let currentPoint = { x: startPoint.x, y: startPoint.y };
    let direction = startCell.direction;
    let finalCell = { ...currentPoint };
    const safetyLimit = board.width * board.height * 4;

    for (let stepIndex = 0; stepIndex < safetyLimit; stepIndex += 1) {
      const vector = getDirection(direction);
      const nextPoint = {
        x: currentPoint.x + vector.x,
        y: currentPoint.y + vector.y,
      };

      if (vector.x !== 0 && vector.y !== 0 && this.isCornerBlocked(board, currentPoint, vector)) {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "cornerBlocked",
          entered: false,
        });
        return this.createResult(startPoint, "failed", "cornerBlocked", path, segments, finalCell, visited);
      }

      if (!this.gridSystem.inBounds(board, nextPoint.x, nextPoint.y)) {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "outOfBounds",
          entered: false,
        });
        return this.createResult(startPoint, "failed", "outOfBounds", path, segments, finalCell, visited);
      }

      const nextCell = this.gridSystem.getCell(board, nextPoint.x, nextPoint.y);
      if (nextCell.type === "wall") {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "wall",
          entered: false,
        });
        return this.createResult(startPoint, "failed", "wall", path, segments, finalCell, visited);
      }

      const nextKey = pointKey(nextPoint.x, nextPoint.y);
      if (visited.has(nextKey)) {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "loop",
          entered: false,
        });
        return this.createResult(startPoint, "failed", "loop", path, segments, finalCell, visited);
      }

      visited.add(nextKey);
      path.push({ ...nextPoint });
      finalCell = { ...nextPoint };

      if (nextCell.type === "goal") {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "goal",
          entered: true,
        });
        return this.createResult(startPoint, "success", "goal", path, segments, finalCell, visited);
      }

      if (nextCell.type === "arrow") {
        segments.push({
          from: { ...currentPoint },
          to: { ...nextPoint },
          direction,
          result: "arrow",
          entered: true,
        });
        currentPoint = nextPoint;
        direction = nextCell.direction;
        continue;
      }

      segments.push({
        from: { ...currentPoint },
        to: { ...nextPoint },
        direction,
        result: "empty",
        entered: true,
      });
      currentPoint = nextPoint;
    }

    return this.createResult(startPoint, "failed", "loop", path, segments, finalCell, visited);
  }

  isCornerBlocked(board, currentPoint, vector) {
    const horizontalX = currentPoint.x + vector.x;
    const horizontalY = currentPoint.y;
    const verticalX = currentPoint.x;
    const verticalY = currentPoint.y + vector.y;
    return this.gridSystem.isWall(board, horizontalX, horizontalY) || this.gridSystem.isWall(board, verticalX, verticalY);
  }

  createResult(start, status, endReason, path, segments, finalCell = null, visited = new Set()) {
    return {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      start: start ? { ...start } : null,
      status,
      endReason,
      path: path.map((point) => ({ ...point })),
      segments: segments.map((segment) => ({
        ...segment,
        from: { ...segment.from },
        to: { ...segment.to },
      })),
      visited: Array.from(visited),
      activeCell: finalCell ? { ...finalCell } : start ? { ...start } : null,
    };
  }
}
