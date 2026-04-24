export type Direction = "left" | "right" | "up" | "down";

export type OverlayState = {
  visible: boolean;
  mode: "start" | "end";
  title: string;
  body: string;
  buttonText: string;
};

export type Game2048Snapshot = {
  size: number;
  board: number[][];
  score: number;
  bestScore: number;
  started: boolean;
  gameOver: boolean;
  hasWon: boolean;
  statusText: string;
  overlay: OverlayState;
};

export type KernelAction =
  | { type: "start_or_restart" }
  | { type: "dismiss_overlay" }
  | { type: "show_swipe_hint" }
  | { type: "move"; direction: Direction };

export type KernelListener = (snapshot: Game2048Snapshot) => void;

export type GameKernel = {
  id: string;
  subscribe: (listener: KernelListener) => () => void;
  dispatch: (action: KernelAction) => void;
  getSnapshot: () => Game2048Snapshot;
};
