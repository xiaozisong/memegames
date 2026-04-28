import { listDirections } from "../utils/directions.js";

const VALID_TYPES = new Set(["empty", "arrow", "wall", "goal"]);
const VALID_DIRECTIONS = new Set(listDirections());

export class GridSystem {
  createBoard(boardConfig = {}, levelConfig = {}) {
    const width = Number(boardConfig.width || 0);
    const height = Number(boardConfig.height || 0);
    const sourceRows = Array.isArray(levelConfig.cells) && levelConfig.cells.length
      ? levelConfig.cells
      : this.createEmptyCells(width, height);
    if (!width || !height) throw new Error("Board width/height must be provided.");
    if (sourceRows.length !== height) throw new Error(`Board height mismatch. Expected ${height}, received ${sourceRows.length}.`);

    const cells = sourceRows.map((row, y) => {
      if (!Array.isArray(row) || row.length !== width) {
        throw new Error(`Board row ${y} must contain ${width} cells.`);
      }
      return row.map((token, x) => this.parseCellToken(token, x, y));
    });

    const board = {
      width,
      height,
      cellSize: Number(boardConfig.cellSize || 48),
      gap: Number(boardConfig.gap || 8),
      stepDurationMs: Number(boardConfig.stepDurationMs || 210),
      triggerScaleDurationMs: Number(boardConfig.triggerScaleDurationMs || 150),
      pathStrokeWidth: Number(boardConfig.pathStrokeWidth || 8),
      indicatorRadius: Number(boardConfig.indicatorRadius || 10),
      cells,
    };

    const goalCount = this.countCells(board, "goal");
    const arrowCount = this.countCells(board, "arrow");
    const hasWorms = Array.isArray(levelConfig.worms) && levelConfig.worms.length > 0;
    if (!hasWorms && goalCount < 1) throw new Error("Level must contain at least one goal.");
    if (!hasWorms && arrowCount < 1) throw new Error("Level must contain at least one arrow.");
    return board;
  }

  parseCellToken(token, x, y) {
    if (typeof token === "string") {
      const [typePart, directionPart] = token.split(":");
      const type = VALID_TYPES.has(typePart) ? typePart : "empty";
      const cell = { type, x, y };
      if (type === "arrow") {
        cell.direction = VALID_DIRECTIONS.has(directionPart) ? directionPart : "right";
        cell.zIndex = 0;
      }
      return cell;
    }

    if (token && typeof token === "object") {
      const type = VALID_TYPES.has(token.type) ? token.type : "empty";
      const cell = { type, x, y };
      if (type === "arrow") {
        cell.direction = VALID_DIRECTIONS.has(token.direction) ? token.direction : "right";
        cell.zIndex = Number.isFinite(token.zIndex) ? Number(token.zIndex) : 0;
        if (typeof token.id === "string" && token.id) {
          cell.id = token.id;
        }
        if (typeof token.color === "string" && token.color) {
          cell.color = token.color;
        }
      }
      return cell;
    }

    return { type: "empty", x, y };
  }

  getCell(board, x, y) {
    if (!this.inBounds(board, x, y)) return null;
    return board.cells[y][x] ?? null;
  }

  inBounds(board, x, y) {
    return x >= 0 && y >= 0 && x < board.width && y < board.height;
  }

  isWall(board, x, y) {
    return this.getCell(board, x, y)?.type === "wall";
  }

  cloneBoard(board) {
    return {
      ...board,
      cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
    };
  }

  countCells(board, type) {
    let count = 0;
    for (const row of board.cells) {
      for (const cell of row) {
        if (cell.type === type) count += 1;
      }
    }
    return count;
  }

  createEmptyCells(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => "empty"));
  }
}
