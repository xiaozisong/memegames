import { getDirection } from "../utils/directions.js";

export class ArrowSystem {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  isArrowCell(board, point) {
    const cell = this.gridSystem.getCell(board, point?.x, point?.y);
    return cell?.type === "arrow";
  }

  getDirectionVector(cell) {
    if (!cell || cell.type !== "arrow") return null;
    return getDirection(cell.direction);
  }

  getNextPoint(point, direction) {
    const vector = getDirection(direction);
    return {
      x: point.x + vector.x,
      y: point.y + vector.y,
    };
  }
}
