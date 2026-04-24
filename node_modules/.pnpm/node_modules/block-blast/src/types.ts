export type Primitive = string | number | boolean;

export type GemTarget = {
  id: string;
  required: number;
};

export type Cell = {
  filled: boolean;
  gemId: string | null;
  value?: number;
};

export type GameState = {
  board: Cell[][];
  score: number;
  movesUsed: number;
  moveLimit: number;
  combo: number;
  gemProgress: Record<string, number>;
  message: string;
  isOver: boolean;
  didWin: boolean;
};

export type TurnResult = {
  scoreGain: number;
  clearedCells: number;
  lineClears: number;
  gemGain: Record<string, number>;
  comboGain: number;
  message: string;
  forcedGameOver?: boolean;
};

export type TurnContext = {
  state: GameState;
  random: () => number;
  getSetting: <T>(path: string, fallback: T) => T;
};

export type MechanicPlugin = {
  id: string;
  actionLabel: string;
  performTurn: (ctx: TurnContext) => TurnResult;
};
