export function createSeededRandom(seed = 0) {
  if (!Number.isFinite(seed) || seed === 0) return Math.random;
  let state = (Math.abs(Math.floor(seed)) || 1) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function areAdjacent(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function swapCells(board, a, b) {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

export function createInitialBoard(rows, cols, kindIds, createTile, findMatches, hasPossibleMove) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const candidates = shuffle(kindIds.slice()).filter((kind) => {
          if (col >= 2 && board[row][col - 1]?.kind === kind && board[row][col - 2]?.kind === kind) return false;
          if (row >= 2 && board[row - 1][col]?.kind === kind && board[row - 2][col]?.kind === kind) return false;
          return true;
        });
        const nextKind = (candidates[0] ?? kindIds[0]) || "happy";
        board[row][col] = createTile(nextKind);
      }
    }
    if (findMatches(board).positions.length === 0 && hasPossibleMove(board)) {
      return board;
    }
  }

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, index) => createTile(kindIds[index % Math.max(1, kindIds.length)] ?? "happy")),
  );
}

export function collapseBoard(board, rows, cols, createTile) {
  const drops = [];
  const spawns = [];

  for (let col = 0; col < cols; col += 1) {
    const existing = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      const tile = board[row][col];
      if (tile) existing.push({ tile, fromRow: row });
    }

    for (let i = 0; i < rows; i += 1) {
      const targetRow = rows - 1 - i;
      const entry = existing[i];
      if (entry) {
        board[targetRow][col] = entry.tile;
        if (entry.fromRow !== targetRow) {
          drops.push({
            id: entry.tile.id,
            kind: entry.tile.kind,
            fromRow: entry.fromRow,
            fromCol: col,
            toRow: targetRow,
            toCol: col,
          });
        }
      } else {
        const spawnOffset = i - existing.length;
        const tile = createTile();
        board[targetRow][col] = tile;
        spawns.push({
          id: tile.id,
          kind: tile.kind,
          fromRow: -1 - spawnOffset,
          fromCol: col,
          toRow: targetRow,
          toCol: col,
        });
      }
    }
  }

  return { drops, spawns };
}

export function boardToSnapshot(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function shuffleBoardKinds(board, createTile, findMatches, hasPossibleMove) {
  const kinds = board.flat().filter(Boolean).map((tile) => tile.kind);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const pool = shuffle(kinds.slice());
    const nextBoard = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    let pointer = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        nextBoard[row][col] = createTile(pool[pointer] ?? kinds[pointer % kinds.length] ?? "happy");
        pointer += 1;
      }
    }
    if (findMatches(nextBoard).positions.length === 0 && hasPossibleMove(nextBoard)) {
      return nextBoard;
    }
  }
  return cloneBoard(board);
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
