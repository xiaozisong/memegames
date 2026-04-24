import { MechanicPlugin } from "../types";
import { chooseGemId, copyBoard, pieceShapes, pickWeighted, randomInt } from "./helpers";

export const blockBlastPlugin: MechanicPlugin = {
  id: "blockblast",
  actionLabel: "Drop Next Piece",
  performTurn: ({ state, random, getSetting }) => {
    const baseClear = getSetting<number>("gameplay.rules.scoring.baseClear", 100);
    const gemBonus = getSetting<number>("gameplay.rules.scoring.gemBonus", 50);
    const piecePool = getSetting<string[]>(
      "gameplay.mechanics.params.blockblast.piecePool",
      ["single", "line2", "line3", "L3", "square2"]
    );
    const pieceWeights = getSetting<Record<string, number>>(
      "gameplay.mechanics.params.blockblast.pieceWeights",
      { single: 18, line2: 14, line3: 10, L3: 8, square2: 6 }
    );

    const board = copyBoard(state.board);
    const allWeights: Record<string, number> = {};
    for (const id of piecePool) allWeights[id] = pieceWeights[id] ?? 1;
    const pieceId = pickWeighted(allWeights, random);
    const shape = pieceShapes[pieceId] ?? pieceShapes.single;

    const placements: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        let canPlace = true;
        for (const [dr, dc] of shape) {
          const rr = row + dr;
          const cc = col + dc;
          if (rr >= board.length || cc >= board[0].length || board[rr][cc].filled) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) placements.push({ row, col });
      }
    }

    if (placements.length === 0) {
      return {
        scoreGain: 0,
        clearedCells: 0,
        lineClears: 0,
        gemGain: {},
        comboGain: 0,
        forcedGameOver: true,
        message: `BlockBlast: no valid placement for ${pieceId}`
      };
    }

    const pick = placements[randomInt(placements.length, random)];
    for (const [dr, dc] of shape) {
      const rr = pick.row + dr;
      const cc = pick.col + dc;
      board[rr][cc].filled = true;
      board[rr][cc].gemId = chooseGemId(getSetting, random);
    }

    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let row = 0; row < board.length; row += 1) {
      if (board[row].every((cell) => cell.filled)) fullRows.push(row);
    }
    for (let col = 0; col < board[0].length; col += 1) {
      let full = true;
      for (let row = 0; row < board.length; row += 1) {
        if (!board[row][col].filled) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(col);
    }

    const clearSet = new Set<string>();
    for (const row of fullRows) {
      for (let col = 0; col < board[row].length; col += 1) clearSet.add(`${row}:${col}`);
    }
    for (const col of fullCols) {
      for (let row = 0; row < board.length; row += 1) clearSet.add(`${row}:${col}`);
    }

    const gemGain: Record<string, number> = {};
    for (const key of clearSet) {
      const [row, col] = key.split(":").map(Number);
      const gemId = board[row][col].gemId;
      if (gemId) gemGain[gemId] = (gemGain[gemId] ?? 0) + 1;
      board[row][col] = { filled: false, gemId: null };
    }

    state.board = board;
    const lineClears = fullRows.length + fullCols.length;
    const clearedCells = clearSet.size;
    const gemTotal = Object.values(gemGain).reduce((sum, value) => sum + value, 0);
    const scoreGain =
      lineClears === 0
        ? Math.max(15, shape.length * 10)
        : lineClears * baseClear + clearedCells * 12 + gemTotal * gemBonus;

    return {
      scoreGain,
      clearedCells,
      lineClears,
      gemGain,
      comboGain: lineClears > 1 ? 1 : 0,
      message:
        lineClears > 0
          ? `BlockBlast: ${pieceId}, clear ${lineClears} lines`
          : `BlockBlast: ${pieceId}, placed`
    };
  }
};
