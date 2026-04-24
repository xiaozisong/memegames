import { getSetting } from "./config";
import { GemTarget } from "./types";

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

export type BlockBlastSnapshot = {
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

const pieceShapes: Record<string, Array<[number, number]>> = {
  single: [[0, 0]],
  line2: [
    [0, 0],
    [0, 1]
  ],
  line3: [
    [0, 0],
    [0, 1],
    [0, 2]
  ],
  line4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3]
  ],
  L3: [
    [0, 0],
    [1, 0],
    [1, 1]
  ],
  square2: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ],
  T4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1]
  ]
};

type Listener = (snapshot: BlockBlastSnapshot) => void;

export class BlockBlastEngine {
  private readonly rows = getSetting<number>("gameplay.board.rows", 8);
  private readonly cols = getSetting<number>("gameplay.board.cols", 8);
  private readonly targetScore = getSetting<number>("gameplay.objectives.targetScore", 1200);
  private readonly moveLimit = getSetting<number>("gameplay.objectives.moveLimit", 0);
  private readonly bagSize = getSetting<number>("gameplay.rules.bagSize", 3);
  private readonly gemTargets = getSetting<GemTarget[]>("gameplay.objectives.gemTargets", []);
  private readonly piecePool = getSetting<string[]>("gameplay.mechanics.params.blockblast.piecePool", [
    "single",
    "line2",
    "line3",
    "line4",
    "L3",
    "square2",
    "T4"
  ]);
  private readonly pieceWeights = getSetting<Record<string, number>>(
    "gameplay.mechanics.params.blockblast.pieceWeights",
    { single: 18, line2: 14, line3: 10, line4: 8, L3: 8, square2: 6, T4: 7 }
  );
  private readonly pieceColors = getSetting<string[]>("gameplay.mechanics.params.blockblast.pieceColors", [
    "#3B6AF6",
    "#2ED573",
    "#FFD93D",
    "#FF7A2F",
    "#FF4D4D",
    "#A66BFF",
    "#3DDCFF"
  ]);
  private readonly gemChance = getSetting<number>("gameplay.mechanics.params.blockblast.gemChance", 0.2);

  private readonly colors = {
    bgTop: getSetting<string>("theme.colors.backgroundGradientTop", "#4B63B7"),
    bgBottom: getSetting<string>("theme.colors.backgroundGradientBottom", "#5E78D6"),
    panel: getSetting<string>("theme.colors.panel", "rgba(255,255,255,0.12)"),
    boardBg: getSetting<string>("theme.colors.boardBackground", "#2E3A70"),
    gridLine: getSetting<string>("theme.colors.gridLine", "rgba(255,255,255,0.05)"),
    textPrimary: getSetting<string>("theme.colors.textPrimary", "#FFFFFF"),
    textAccent: getSetting<string>("theme.colors.textAccent", "#FFD93D"),
    iconColor: getSetting<string>("theme.colors.iconColor", "#CFE3FF"),
    highlight: getSetting<string>("theme.colors.blockHighlight", "rgba(255,255,255,0.25)"),
    shadow: getSetting<string>("theme.colors.blockShadow", "rgba(0,0,0,0.2)")
  };

  private readonly title = getSetting<string>("presentation.ui.title", "Block Blast Test");
  private readonly subtitle = getSetting<string>("presentation.ui.subtitle", "Relaxing");
  private readonly scoreIcon = getSetting<string>("presentation.ui.scoreIcon", "👑");
  private readonly ctaText = getSetting<string>("presentation.ui.ctaText", "RELAXING!");

  private listeners: Listener[] = [];

  private state = {
    board: this.createBoard(),
    bag: [] as Array<Piece | null>,
    selectedPieceIndex: null as number | null,
    score: 0,
    movesUsed: 0,
    gemProgress: Object.fromEntries(this.gemTargets.map((g) => [g.id, 0])) as Record<string, number>,
    message: "Tap to Start",
    started: false,
    isOver: false,
    didWin: false,
    overlay: {
      visible: true,
      title: "Tap to Start",
      body: "放置方块，填满整行整列来消除，达成目标分数与宝石目标。",
      buttonText: "Start"
    } as OverlayState
  };

  constructor() {
    this.resetGame(false);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  getSnapshot(): BlockBlastSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      targetScore: this.targetScore,
      moveLimit: this.moveLimit,
      bagSize: this.bagSize,
      scoreIcon: this.scoreIcon,
      ctaText: this.ctaText,
      title: this.title,
      subtitle: this.subtitle,
      colors: this.colors,
      state: {
        board: this.state.board.map((row) => row.map((cell) => ({ ...cell }))),
        bag: this.state.bag.map((piece) =>
          piece ? { ...piece, cells: piece.cells.map((cell) => ({ ...cell })) } : null
        ),
        selectedPieceIndex: this.state.selectedPieceIndex,
        score: this.state.score,
        movesUsed: this.state.movesUsed,
        gemProgress: { ...this.state.gemProgress },
        message: this.state.message,
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        overlay: { ...this.state.overlay }
      },
      gemTargets: this.gemTargets.map((item) => ({ ...item }))
    };
  }

  startOrRestart(): void {
    if (this.state.isOver) {
      this.resetGame();
      return;
    }
    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "选择下方方块，然后点击棋盘落子。无倒计时，轻松布局。";
    this.notify();
  }

  selectPiece(index: number): void {
    if (!this.state.started || this.state.isOver) return;
    if (!this.state.bag[index]) return;
    this.state.selectedPieceIndex = index;
    this.notify();
  }

  setRelaxHint(): void {
    this.state.message = "No pressure mode: no timer, focus on clean placements.";
    this.notify();
  }

  placeAt(anchorRow: number, anchorCol: number): void {
    if (!this.state.started || this.state.isOver) return;
    if (this.state.selectedPieceIndex === null) {
      this.state.message = "请先选择下方的方块。";
      this.notify();
      return;
    }
    const selected = this.state.bag[this.state.selectedPieceIndex];
    if (!selected) return;
    if (!this.canPlacePiece(this.state.board, selected, anchorRow, anchorCol)) {
      this.state.message = "当前位置无法放置该方块。";
      this.notify();
      return;
    }

    for (const cell of selected.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      this.state.board[row][col] = { filled: true, color: selected.color, gemId: cell.gemId };
    }
    this.state.bag[this.state.selectedPieceIndex] = null;
    this.state.movesUsed += 1;

    const baseClear = getSetting<number>("gameplay.rules.scoring.baseClear", 100);
    const gemBonus = getSetting<number>("gameplay.rules.scoring.gemBonus", 50);
    const comboMultiplier = getSetting<number>("gameplay.rules.scoring.comboMultiplier", 1.2);
    const result = this.clearCompletedLines();
    const gemCount = Object.values(result.gemGain).reduce((sum, value) => sum + value, 0);
    const roundScore =
      result.lines > 0
        ? Math.round(result.lines * baseClear + result.cleared * 8 + gemCount * gemBonus)
        : selected.cells.length * 6;
    this.state.score += roundScore;
    if (result.lines > 1) {
      this.state.score += Math.round((result.lines - 1) * baseClear * (comboMultiplier - 1));
    }
    for (const [gemId, count] of Object.entries(result.gemGain)) {
      this.state.gemProgress[gemId] = (this.state.gemProgress[gemId] ?? 0) + count;
    }

    if (this.state.bag.every((piece) => !piece)) this.refillBag();
    const nextIndex = this.state.bag.findIndex(Boolean);
    this.state.selectedPieceIndex = nextIndex >= 0 ? nextIndex : null;
    this.state.message =
      result.lines > 0
        ? `同时消除了 ${result.lines} 条线，+${roundScore} 分`
        : `已放置 ${selected.id}，继续布局`;

    this.checkEndState();
    this.notify();
  }

  private resetGame(emit = true): void {
    this.state.board = this.createBoard();
    this.state.score = 0;
    this.state.movesUsed = 0;
    this.state.started = false;
    this.state.isOver = false;
    this.state.didWin = false;
    this.state.message = "Tap to Start";
    this.state.gemProgress = Object.fromEntries(this.gemTargets.map((g) => [g.id, 0]));
    this.state.overlay = {
      visible: true,
      title: "Tap to Start",
      body: "放置方块，填满整行整列来消除，达成目标分数与宝石目标。",
      buttonText: "Start"
    };
    this.assignPrefilledCells();
    this.refillBag();
    if (emit) this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private createBoard(): BoardCell[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        filled: false,
        color: this.colors.gridLine,
        gemId: null
      }))
    );
  }

  private assignPrefilledCells(): void {
    const prefilled = getSetting<Array<{ row: number; col: number; type: string; gemId?: string }>>(
      "gameplay.bootstrap.preFilledCells",
      []
    );
    for (const item of prefilled) {
      if (item.row < 0 || item.col < 0 || item.row >= this.rows || item.col >= this.cols) continue;
      if (item.type === "empty") continue;
      this.state.board[item.row][item.col] = {
        filled: true,
        color: this.pieceColors[this.randomInt(this.pieceColors.length)],
        gemId: item.gemId ?? null
      };
    }
  }

  private createPiece(): Piece {
    const id = this.pickWeighted(this.pieceWeights);
    const shape = pieceShapes[id] ?? pieceShapes.single;
    const color = this.pieceColors[this.randomInt(this.pieceColors.length)];
    const cells = shape.map(([row, col]) => ({
      row,
      col,
      gemId: this.pickGemId()
    }));
    return { id, color, cells };
  }

  private refillBag(): void {
    this.state.bag = Array.from({ length: this.bagSize }, () => this.createPiece());
    const selected = this.state.bag.findIndex(Boolean);
    this.state.selectedPieceIndex = selected >= 0 ? selected : null;
  }

  private canPlacePiece(board: BoardCell[][], piece: Piece, anchorRow: number, anchorCol: number): boolean {
    for (const cell of piece.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return false;
      if (board[row][col].filled) return false;
    }
    return true;
  }

  private canAnyPieceBePlaced(): boolean {
    for (const piece of this.state.bag) {
      if (!piece) continue;
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.cols; col += 1) {
          if (this.canPlacePiece(this.state.board, piece, row, col)) return true;
        }
      }
    }
    return false;
  }

  private clearCompletedLines(): { lines: number; cleared: number; gemGain: Record<string, number> } {
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let row = 0; row < this.rows; row += 1) {
      if (this.state.board[row].every((cell) => cell.filled)) fullRows.push(row);
    }
    for (let col = 0; col < this.cols; col += 1) {
      let full = true;
      for (let row = 0; row < this.rows; row += 1) {
        if (!this.state.board[row][col].filled) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(col);
    }

    const clearSet = new Set<string>();
    for (const row of fullRows) for (let col = 0; col < this.cols; col += 1) clearSet.add(`${row}:${col}`);
    for (const col of fullCols) for (let row = 0; row < this.rows; row += 1) clearSet.add(`${row}:${col}`);

    const gemGain: Record<string, number> = {};
    for (const key of clearSet) {
      const [row, col] = key.split(":").map(Number);
      const gemId = this.state.board[row][col].gemId;
      if (gemId) gemGain[gemId] = (gemGain[gemId] ?? 0) + 1;
      this.state.board[row][col] = { filled: false, color: this.colors.gridLine, gemId: null };
    }
    return { lines: fullRows.length + fullCols.length, cleared: clearSet.size, gemGain };
  }

  private checkEndState(): void {
    const gemsReached = this.gemTargets.every(
      (target) => (this.state.gemProgress[target.id] ?? 0) >= target.required
    );
    if (this.state.score >= this.targetScore && gemsReached) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.message = "Great! You cleared the level.";
      this.state.overlay = {
        visible: true,
        title: "Level Complete",
        body: "你达成了分数和宝石目标，继续保持这种放松节奏。",
        buttonText: "Restart"
      };
      return;
    }
    const hasMoveLimit = this.moveLimit > 0;
    if ((hasMoveLimit && this.state.movesUsed >= this.moveLimit) || !this.canAnyPieceBePlaced()) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.message = "No more valid placement.";
      this.state.overlay = {
        visible: true,
        title: "Try Again",
        body: "当前三块都无法放置，轻松重开再来一局。",
        buttonText: "Restart"
      };
    }
  }

  private pickGemId(): string | null {
    if (this.gemTargets.length === 0 || Math.random() > this.gemChance) return null;
    return this.gemTargets[this.randomInt(this.gemTargets.length)].id;
  }

  private randomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  private pickWeighted(weights: Record<string, number>): string {
    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    const filtered = entries.filter(([id]) => this.piecePool.includes(id));
    const pool = filtered.length > 0 ? filtered : entries;
    if (pool.length === 0) return "single";

    const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
    let cursor = Math.random() * total;
    for (const [id, weight] of pool) {
      cursor -= weight;
      if (cursor <= 0) return id;
    }
    return pool[pool.length - 1][0];
  }
}
