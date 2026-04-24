import { GemTarget, GameState } from "./types";

export function makeBoard(rows: number, cols: number): GameState["board"] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ filled: false, gemId: null }))
  );
}

export function createInitialState(
  getSetting: <T>(path: string, fallback: T) => T
): GameState {
  const rows = getSetting<number>("gameplay.board.rows", 8);
  const cols = getSetting<number>("gameplay.board.cols", 8);
  const moveLimit = getSetting<number>("gameplay.objectives.moveLimit", 24);
  const board = makeBoard(rows, cols);
  const gemTargets = getSetting<GemTarget[]>("gameplay.objectives.gemTargets", []);
  const gemProgress: Record<string, number> = {};
  for (const target of gemTargets) {
    gemProgress[target.id] = 0;
  }

  const prefilled = getSetting<
    Array<{ row: number; col: number; type: string; gemId?: string }>
  >("gameplay.bootstrap.preFilledCells", []);
  for (const item of prefilled) {
    if (item.row < 0 || item.col < 0) continue;
    if (item.row >= rows || item.col >= cols) continue;
    board[item.row][item.col].filled = item.type !== "empty";
    board[item.row][item.col].gemId = item.gemId ?? null;
  }

  return {
    board,
    score: 0,
    movesUsed: 0,
    moveLimit,
    combo: 0,
    gemProgress,
    message: "Template ready. Execute one turn to test rule flow.",
    isOver: false,
    didWin: false
  };
}

export function applyResult(
  state: GameState,
  result: {
    scoreGain: number;
    gemGain: Record<string, number>;
    comboGain: number;
    message: string;
    forcedGameOver?: boolean;
  },
  getSetting: <T>(path: string, fallback: T) => T
): void {
  state.score += result.scoreGain;
  state.movesUsed += 1;
  state.combo = result.comboGain > 0 ? state.combo + result.comboGain : 0;
  state.message = result.message;
  for (const [gemId, count] of Object.entries(result.gemGain)) {
    state.gemProgress[gemId] = (state.gemProgress[gemId] ?? 0) + count;
  }

  const targetScore = getSetting<number>("gameplay.objectives.targetScore", 1200);
  const gemTargets = getSetting<GemTarget[]>("gameplay.objectives.gemTargets", []);
  const scoreReached = state.score >= targetScore;
  const gemsReached = gemTargets.every(
    (target) => (state.gemProgress[target.id] ?? 0) >= target.required
  );
  const moveLimitReached = state.movesUsed >= state.moveLimit;

  if (scoreReached && gemsReached) {
    state.isOver = true;
    state.didWin = true;
    state.message = "Win: objective reached.";
    return;
  }
  if (result.forcedGameOver || moveLimitReached) {
    state.isOver = true;
    state.didWin = false;
    state.message = result.forcedGameOver
      ? "Lose: no valid move for current mechanic."
      : "Lose: move limit reached.";
  }
}
