import { getSetting } from "../config";
import {
  BoardCell,
  EliminationSnapshot,
  GameKernel,
  GemTarget,
  KernelAction,
  KernelListener,
  OverlayState,
  Piece,
  PieceCell,
} from "../core/contracts";
import { lineClearSystem } from "../systems/LineClearSystem";

type FilledSeed = {
  row: number;
  col: number;
  color?: string;
  gemType?: string;
};

type ShapeType =
  | "single"
  | "line2"
  | "line3"
  | "line4"
  | "L"
  | "square"
  | "T";

type ShapeConfig = {
  type: ShapeType;
};

type GameAction =
  | { type: "PLACE_BLOCK"; row: number; col: number }
  | { type: "CLEAR_LINES" }
  | { type: "NEXT_BLOCK_SET" };

const SHAPES: Record<ShapeType, Array<[number, number]>> = {
  single: [[0, 0]],
  line2: [
    [0, 0],
    [0, 1],
  ],
  line3: [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  line4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  L: [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  square: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  T: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
};

export class BlockPlacementKernel implements GameKernel {
  id = "block-placement";
  private listeners: KernelListener[] = [];
  private pieceCounter = 0;

  private readonly size = getSetting<number>("gameplay.gridSize", 8);
  private readonly rows = getSetting<number>("gameplay.board.rows", this.size);
  private readonly cols = getSetting<number>("gameplay.board.cols", this.size);
  private readonly movesLimit = getSetting<number>("gameplay.moves", 15);
  private readonly bagSize = 3;
  private readonly gemTargets = getSetting<GemTarget[]>(
    "gameplay.gemTargets",
    [
      { id: "red", required: 10 },
      { id: "blue", required: 8 },
    ],
  );
  private readonly initialFilled = getSetting<FilledSeed[]>(
    "gameplay.initialBoard.filledCells",
    [],
  );
  private readonly shapePool = getSetting<ShapeConfig[]>("gameplay.shapes", [
    { type: "L" },
    { type: "square" },
    { type: "line3" },
    { type: "line4" },
  ]);
  private readonly pieceColors = getSetting<string[]>(
    "gameplay.mechanics.params.blockPlacement.pieceColors",
    ["#36d7ff", "#9b6cff", "#ffd34a", "#54ffb5"],
  );
  private readonly scorePerCell = getSetting<number>(
    "gameplay.mechanics.params.blockPlacement.scorePerCell",
    8,
  );
  private readonly scorePerLine = getSetting<number>(
    "gameplay.mechanics.params.blockPlacement.scorePerLine",
    120,
  );
  private readonly scorePerGem = getSetting<number>(
    "gameplay.mechanics.params.blockPlacement.scorePerGem",
    60,
  );

  private readonly colors = {
    bgTop: getSetting<string>("theme.colors.backgroundGradientTop", "#090a17"),
    bgBottom: getSetting<string>("theme.colors.backgroundGradientBottom", "#100b28"),
    panel: getSetting<string>("theme.colors.panel", "rgba(0,0,0,0.6)"),
    boardBg: getSetting<string>("theme.colors.boardBackground", "#131930"),
    gridLine: getSetting<string>("theme.colors.gridLine", "rgba(63,110,167,0.42)"),
    textPrimary: getSetting<string>("theme.colors.textPrimary", "#e3efff"),
    textAccent: getSetting<string>("theme.colors.textAccent", "#00f6ff"),
    iconColor: getSetting<string>("theme.colors.iconColor", "#00f6ff"),
    highlight: getSetting<string>("theme.colors.blockHighlight", "rgba(0,246,255,0.6)"),
    shadow: getSetting<string>("theme.colors.blockShadow", "rgba(0,0,0,0.45)"),
  };

  private readonly title = getSetting<string>(
    "presentation.ui.title",
    "BLOCK PLACEMENT",
  );
  private readonly subtitle = getSetting<string>(
    "presentation.ui.subtitle",
    "Neon Block Elimination",
  );
  private readonly scoreIcon = getSetting<string>("presentation.ui.scoreIcon", "⚡");
  private readonly ctaText = getSetting<string>("presentation.ui.ctaText", "GRID LINK");

  private state = {
    board: [] as BoardCell[][],
    bag: [] as Array<Piece | null>,
    selectedPieceIndex: null as number | null,
    score: 0,
    movesUsed: 0,
    gemProgress: {} as Record<string, number>,
    message: "Tap start",
    started: false,
    isOver: false,
    didWin: false,
    overlay: {
      visible: true,
      title: "Block Placement",
      body: "Drag blocks to board and clear lines.",
      buttonText: "Start",
    } as OverlayState,
  };

  constructor() {
    this.reset(false);
  }

  subscribe(listener: KernelListener): () => void {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action: KernelAction): void {
    if (action.type === "start_or_restart") {
      this.startOrRestart();
      return;
    }
    if (action.type === "set_relax_hint") {
      this.state.message = "Drag a block to a legal highlight.";
      this.notify();
      return;
    }
    if (!this.state.started || this.state.isOver) return;
    if (action.type === "select_piece") {
      if (!this.state.bag[action.index]) return;
      this.state.selectedPieceIndex = action.index;
      this.state.message = "Place the selected block.";
      this.notify();
      return;
    }
    if (action.type === "place_at") {
      this.dispatchGameAction({ type: "PLACE_BLOCK", row: action.row, col: action.col });
    }
  }

  getSnapshot(): EliminationSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      targetScore: this.gemTargets.reduce((sum, t) => sum + t.required, 0),
      moveLimit: this.movesLimit,
      bagSize: this.bagSize,
      scoreIcon: this.scoreIcon,
      ctaText: this.ctaText,
      title: this.title,
      subtitle: this.subtitle,
      colors: this.colors,
      state: {
        board: this.state.board.map((row) => row.map((cell) => ({ ...cell }))),
        bag: this.state.bag.map((piece) =>
          piece
            ? {
                ...piece,
                cells: piece.cells.map((c) => ({ ...c })),
              }
            : null,
        ),
        selectedPieceIndex: this.state.selectedPieceIndex,
        score: this.state.score,
        movesUsed: this.state.movesUsed,
        gemProgress: { ...this.state.gemProgress },
        message: this.state.message,
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        overlay: { ...this.state.overlay },
      },
      gemTargets: this.gemTargets.map((t) => ({ ...t })),
    };
  }

  private startOrRestart(): void {
    if (this.state.isOver) {
      this.reset();
      return;
    }
    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "Drag a block from tray to board.";
    this.notify();
  }

  private reset(emit = true): void {
    this.state.board = this.createBoard();
    this.seedInitialBoard();
    this.state.bag = this.createBag();
    this.state.selectedPieceIndex = this.state.bag.findIndex(Boolean);
    if (this.state.selectedPieceIndex < 0) this.state.selectedPieceIndex = null;
    this.state.score = 0;
    this.state.movesUsed = 0;
    this.state.gemProgress = Object.fromEntries(
      this.gemTargets.map((g) => [g.id, 0]),
    );
    this.state.started = false;
    this.state.isOver = false;
    this.state.didWin = false;
    this.state.message = "Tap start";
    this.state.overlay = {
      visible: true,
      title: "Block Placement",
      body: "Drag blocks, clear lines, collect gems.",
      buttonText: "Start",
    };
    if (emit) this.notify();
  }

  private dispatchGameAction(action: GameAction): void {
    if (action.type === "PLACE_BLOCK") {
      this.handlePlaceBlock(action.row, action.col);
      return;
    }
    if (action.type === "CLEAR_LINES") {
      this.handleClearLines();
      return;
    }
    if (action.type === "NEXT_BLOCK_SET") {
      this.handleNextBlockSet();
    }
  }

  private handlePlaceBlock(anchorRow: number, anchorCol: number): void {
    const index = this.state.selectedPieceIndex;
    if (index === null) return;
    const piece = this.state.bag[index];
    if (!piece) return;
    if (!this.canPlace(piece, anchorRow, anchorCol)) {
      this.state.message = "Invalid placement.";
      this.notify();
      return;
    }

    for (const cell of piece.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      this.state.board[row][col] = {
        filled: true,
        color: piece.color,
        gemId: cell.gemId,
      };
    }

    this.state.score += piece.cells.length * this.scorePerCell;
    this.state.movesUsed += 1;
    this.state.bag[index] = null;
    this.state.selectedPieceIndex = this.state.bag.findIndex(Boolean);
    if (this.state.selectedPieceIndex < 0) this.state.selectedPieceIndex = null;

    this.dispatchGameAction({ type: "CLEAR_LINES" });

    if (this.state.bag.every((b) => !b)) {
      this.dispatchGameAction({ type: "NEXT_BLOCK_SET" });
    }

    this.resolveGameState();
    this.notify();
  }

  private handleClearLines(): void {
    const result = lineClearSystem<BoardCell>({
      grid: this.state.board,
      axes: ["row", "column"],
      isCellFilled: (cell) => cell.filled,
    });

    if (result.clearedPositions.length === 0) {
      this.state.message = "Placed";
      return;
    }

    const gemGain: Record<string, number> = {};
    for (const pos of result.clearedPositions) {
      const current = this.state.board[pos.row][pos.col];
      if (current.gemId) {
        gemGain[current.gemId] = (gemGain[current.gemId] ?? 0) + 1;
      }
      this.state.board[pos.row][pos.col] = this.emptyCell();
    }

    const clearedLines = result.clearedLines.length;
    const clearedCells = result.clearedPositions.length;
    this.state.score +=
      clearedLines * this.scorePerLine +
      clearedCells * this.scorePerCell +
      Object.values(gemGain).reduce((sum, n) => sum + n, 0) * this.scorePerGem;

    for (const [gemType, count] of Object.entries(gemGain)) {
      this.state.gemProgress[gemType] = (this.state.gemProgress[gemType] ?? 0) + count;
    }

    this.state.message =
      clearedLines > 1 ? `COMBO x${clearedLines}` : `Cleared ${clearedLines} line`;
  }

  private handleNextBlockSet(): void {
    this.state.bag = this.createBag();
    this.state.selectedPieceIndex = this.state.bag.findIndex(Boolean);
    if (this.state.selectedPieceIndex < 0) this.state.selectedPieceIndex = null;
  }

  private resolveGameState(): void {
    const completed = this.gemTargets.every(
      (goal) => (this.state.gemProgress[goal.id] ?? 0) >= goal.required,
    );
    if (completed) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.overlay = {
        visible: true,
        title: "YOU WIN",
        body: "All gem goals completed.",
        buttonText: "Play Again",
      };
      return;
    }

    if (this.state.movesUsed >= this.movesLimit) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = {
        visible: true,
        title: "OUT OF MOVES",
        body: "No moves left. Try again.",
        buttonText: "Retry",
      };
      return;
    }

    const hasPlaceable = this.state.bag.some((piece) => {
      if (!piece) return false;
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.cols; col += 1) {
          if (this.canPlace(piece, row, col)) return true;
        }
      }
      return false;
    });

    if (!hasPlaceable) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = {
        visible: true,
        title: "NO VALID PLACEMENT",
        body: "No block can be placed.",
        buttonText: "Retry",
      };
    }
  }

  private canPlace(piece: Piece, anchorRow: number, anchorCol: number): boolean {
    for (const cell of piece.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return false;
      if (this.state.board[row][col].filled) return false;
    }
    return true;
  }

  private createBoard(): BoardCell[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => this.emptyCell()),
    );
  }

  private emptyCell(): BoardCell {
    return {
      filled: false,
      color: this.colors.gridLine,
      gemId: null,
    };
  }

  private seedInitialBoard(): void {
    for (const seed of this.initialFilled) {
      if (
        seed.row < 0 ||
        seed.col < 0 ||
        seed.row >= this.rows ||
        seed.col >= this.cols
      ) {
        continue;
      }
      this.state.board[seed.row][seed.col] = {
        filled: true,
        color: seed.color ?? this.randomColor(),
        gemId: seed.gemType ?? null,
      };
    }
  }

  private createBag(): Array<Piece | null> {
    return Array.from({ length: this.bagSize }, () => this.randomPiece());
  }

  private randomPiece(): Piece {
    const shapeType =
      this.shapePool[Math.floor(Math.random() * this.shapePool.length)]?.type ?? "single";
    const shape = SHAPES[shapeType] ?? SHAPES.single;
    const color = this.randomColor();
    const cells: PieceCell[] = shape.map(([row, col]) => ({
      row,
      col,
      gemId: this.randomGemType(),
    }));
    return {
      id: `${shapeType}-${this.pieceCounter++}`,
      color,
      cells,
    };
  }

  private randomColor(): string {
    return this.pieceColors[Math.floor(Math.random() * this.pieceColors.length)]!;
  }

  private randomGemType(): string | null {
    if (this.gemTargets.length === 0) return null;
    const chance = getSetting<number>(
      "gameplay.mechanics.params.blockPlacement.gemSpawnChance",
      0.18,
    );
    if (Math.random() > chance) return null;
    const target =
      this.gemTargets[Math.floor(Math.random() * this.gemTargets.length)]?.id ?? null;
    return target;
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
