import { cloneBoard, swapCells } from "./boardSystem.js";

export function findMatches(board, matchMin = 3) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const groups = [];

  for (let row = 0; row < rows; row += 1) {
    let start = 0;
    while (start < cols) {
      const kind = board[row][start]?.kind;
      if (!kind) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < cols && board[row][end]?.kind === kind) end += 1;
      if (end - start >= matchMin) {
        groups.push(
          Array.from({ length: end - start }, (_, index) => ({
            row,
            col: start + index,
            id: board[row][start + index].id,
            kind,
          })),
        );
      }
      start = end;
    }
  }

  for (let col = 0; col < cols; col += 1) {
    let start = 0;
    while (start < rows) {
      const kind = board[start][col]?.kind;
      if (!kind) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < rows && board[end][col]?.kind === kind) end += 1;
      if (end - start >= matchMin) {
        groups.push(
          Array.from({ length: end - start }, (_, index) => ({
            row: start + index,
            col,
            id: board[start + index][col].id,
            kind,
          })),
        );
      }
      start = end;
    }
  }

  const positionMap = new Map();
  for (const group of groups) {
    for (const pos of group) {
      positionMap.set(`${pos.row}:${pos.col}`, pos);
    }
  }

  return {
    groups,
    positions: Array.from(positionMap.values()),
  };
}

export function hasPossibleMove(board, matchMin = 3) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const from = { row, col };
      const candidates = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];
      for (const to of candidates) {
        if (to.row >= rows || to.col >= cols) continue;
        const boardCopy = cloneBoard(board);
        swapCells(boardCopy, from, to);
        if (findMatches(boardCopy, matchMin).positions.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

export function removeMatchedPositions(board, positions) {
  const removed = [];
  for (const pos of positions) {
    const tile = board[pos.row][pos.col];
    if (!tile) continue;
    removed.push({
      row: pos.row,
      col: pos.col,
      id: tile.id,
      kind: tile.kind,
    });
    board[pos.row][pos.col] = null;
  }
  return removed;
}
