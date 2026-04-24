export type BoardCell = {
  filled: boolean;
  color: string;
  gemId: string | null;
};

export type PieceCell = {
  row: number;
  col: number;
  gemId: string | null;
};

export type Piece = {
  id: string;
  color: string;
  cells: PieceCell[];
};

export type OverlayState = {
  visible: boolean;
  title: string;
  body: string;
  buttonText: string;
};

export type GemTarget = {
  id: string;
  required: number;
};

export type EliminationSnapshot = {
  rows: number;
  cols: number;
  targetScore: number;
  moveLimit: number;
  bagSize: number;
  scoreIcon: string;
  ctaText: string;
  title: string;
  subtitle: string;
  colors: {
    bgTop: string;
    bgBottom: string;
    panel: string;
    boardBg: string;
    gridLine: string;
    textPrimary: string;
    textAccent: string;
    iconColor: string;
    highlight: string;
    shadow: string;
  };
  state: {
    board: BoardCell[][];
    bag: Array<Piece | null>;
    selectedPieceIndex: number | null;
    score: number;
    movesUsed: number;
    gemProgress: Record<string, number>;
    message: string;
    started: boolean;
    isOver: boolean;
    didWin: boolean;
    overlay: OverlayState;
  };
  gemTargets: GemTarget[];
};

export type KernelAction =
  | { type: "start_or_restart" }
  | { type: "set_relax_hint" }
  | { type: "select_piece"; index: number }
  | { type: "place_at"; row: number; col: number };

export type KernelListener = (snapshot: EliminationSnapshot) => void;

export type GameKernel = {
  id: string;
  subscribe: (listener: KernelListener) => () => void;
  dispatch: (action: KernelAction) => void;
  getSnapshot: () => EliminationSnapshot;
};
