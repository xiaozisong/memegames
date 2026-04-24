import { MechanicPlugin } from "../types";
import { chooseGemId, copyBoard, randomInt } from "./helpers";

export const match3Plugin: MechanicPlugin = {
  id: "match3",
  actionLabel: "Simulate Match Turn",
  performTurn: ({ state, random, getSetting }) => {
    const minMatch = getSetting<number>("gameplay.mechanics.params.match3.minMatch", 3);
    const cascadeEnabled = getSetting<boolean>(
      "gameplay.mechanics.params.match3.cascadeEnabled",
      true
    );
    const baseClear = getSetting<number>("gameplay.rules.scoring.baseClear", 100);
    const gemBonus = getSetting<number>("gameplay.rules.scoring.gemBonus", 50);

    const board = copyBoard(state.board);
    const filledCells: Array<[number, number]> = [];
    for (let r = 0; r < board.length; r += 1) {
      for (let c = 0; c < board[r].length; c += 1) {
        if (board[r][c].filled) filledCells.push([r, c]);
      }
    }

    if (filledCells.length < minMatch) {
      for (let i = 0; i < minMatch; i += 1) {
        const row = randomInt(board.length, random);
        const col = randomInt(board[0].length, random);
        board[row][col].filled = true;
        board[row][col].gemId = chooseGemId(getSetting, random);
      }
    }

    const refreshedFilled: Array<[number, number]> = [];
    for (let r = 0; r < board.length; r += 1) {
      for (let c = 0; c < board[r].length; c += 1) {
        if (board[r][c].filled) refreshedFilled.push([r, c]);
      }
    }

    const clearTarget = Math.min(refreshedFilled.length, minMatch + randomInt(4, random));
    const gemGain: Record<string, number> = {};
    for (let i = 0; i < clearTarget; i += 1) {
      const index = randomInt(refreshedFilled.length, random);
      const [row, col] = refreshedFilled.splice(index, 1)[0];
      const gemId = board[row][col].gemId;
      if (gemId) gemGain[gemId] = (gemGain[gemId] ?? 0) + 1;
      board[row][col] = { filled: false, gemId: null };
    }

    if (cascadeEnabled) {
      const refillCount = Math.max(1, randomInt(3, random));
      for (let i = 0; i < refillCount; i += 1) {
        const row = randomInt(board.length, random);
        const col = randomInt(board[0].length, random);
        board[row][col].filled = true;
        board[row][col].gemId = chooseGemId(getSetting, random);
      }
    }

    state.board = board;
    const gemTotal = Object.values(gemGain).reduce((sum, value) => sum + value, 0);
    const scoreGain = clearTarget * baseClear + gemTotal * gemBonus;
    return {
      scoreGain,
      clearedCells: clearTarget,
      lineClears: 0,
      gemGain,
      comboGain: clearTarget >= minMatch + 2 ? 1 : 0,
      message: `Match-3: clear ${clearTarget} cells${cascadeEnabled ? " + cascade" : ""}`
    };
  }
};
