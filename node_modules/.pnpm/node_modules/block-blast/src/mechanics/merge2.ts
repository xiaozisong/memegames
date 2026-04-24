import { MechanicPlugin } from "../types";
import { copyBoard, randomInt } from "./helpers";

export const merge2Plugin: MechanicPlugin = {
  id: "merge2",
  actionLabel: "Simulate Merge Turn",
  performTurn: ({ state, random, getSetting }) => {
    const board = copyBoard(state.board);
    const baseClear = 20;
    const spawnValues = getSetting<number[]>(
      "gameplay.mechanics.params.merge2.spawnValues",
      [2, 2, 2, 4]
    );
    const gemGain: Record<string, number> = {};

    const filled: Array<[number, number]> = [];
    const empty: Array<[number, number]> = [];
    for (let r = 0; r < board.length; r += 1) {
      for (let c = 0; c < board[r].length; c += 1) {
        if (board[r][c].filled) filled.push([r, c]);
        else empty.push([r, c]);
      }
    }

    if (empty.length > 0) {
      const [row, col] = empty[randomInt(empty.length, random)];
      board[row][col].filled = true;
      board[row][col].value = spawnValues[randomInt(spawnValues.length, random)];
      state.board = board;
      return {
        scoreGain: 0,
        clearedCells: 0,
        lineClears: 0,
        gemGain,
        comboGain: 0,
        message: `Merge2: spawn ${board[row][col].value}`
      };
    }

    // Skeleton behavior: when no empty cells, attempt one random merge pair.
    if (filled.length < 2) {
      return {
        scoreGain: 0,
        clearedCells: 0,
        lineClears: 0,
        gemGain,
        comboGain: 0,
        forcedGameOver: true,
        message: "Merge2: no merge candidate."
      };
    }

    const [aRow, aCol] = filled[randomInt(filled.length, random)];
    const [bRow, bCol] = filled[randomInt(filled.length, random)];
    const av = board[aRow][aCol].value ?? 2;
    const bv = board[bRow][bCol].value ?? 2;
    if (aRow === bRow && aCol === bCol) {
      return {
        scoreGain: 0,
        clearedCells: 0,
        lineClears: 0,
        gemGain,
        comboGain: 0,
        forcedGameOver: true,
        message: "Merge2: no valid pair this turn."
      };
    }

    if (av === bv) {
      board[aRow][aCol].value = av * 2;
      board[bRow][bCol] = { filled: false, gemId: null };
      state.board = board;
      return {
        scoreGain: baseClear + av * 4,
        clearedCells: 1,
        lineClears: 0,
        gemGain,
        comboGain: 1,
        message: `Merge2: ${av} + ${bv} => ${av * 2}`
      };
    }

    return {
      scoreGain: 0,
      clearedCells: 0,
      lineClears: 0,
      gemGain,
      comboGain: 0,
      forcedGameOver: true,
      message: "Merge2: board full and no merge."
    };
  }
};
