import { getSetting } from "../config";
import {
  BoardCell,
  EliminationSnapshot,
  GameKernel,
  GemTarget,
  KernelAction,
  KernelListener,
  OverlayState,
} from "../core/contracts";

type GridPoint = { row: number; col: number };

type Match3GoalConfig = {
  type: "collect";
  target: string;
  count: number;
};

type MemeDefinition = {
  id: string;
  label: string;
  color: string;
};

export class Match3Kernel implements GameKernel {
  id = "match3";
  private listeners: KernelListener[] = [];
  private serial = 0;

  private readonly gridSize = getSetting<number>("gameplay.gridSize", 8);
  private readonly rows = getSetting<number>("gameplay.board.rows", this.gridSize);
  private readonly cols = getSetting<number>("gameplay.board.cols", this.gridSize);
  private readonly moveLimit = getSetting<number>("gameplay.moves", 15);
  private readonly goal = getSetting<Match3GoalConfig>("gameplay.goal", {
    type: "collect",
    target: "smile",
    count: 12,
  });
  private readonly memes = getSetting<MemeDefinition[]>(
    "gameplay.mechanics.params.match3.memes",
    [
      { id: "smile", label: "SM", color: "#3BC7FF" },
      { id: "rage", label: "RG", color: "#8A6CFF" },
      { id: "wow", label: "WW", color: "#FFD23A" },
      { id: "lol", label: "LO", color: "#4CF7A1" },
      { id: "sad", label: "SD", color: "#FF5A7E" },
    ],
  );
  private readonly cascadeEnabled = getSetting<boolean>(
    "gameplay.mechanics.params.match3.cascadeEnabled",
    true,
  );
  private readonly allowInvalidSwap = getSetting<boolean>(
    "gameplay.mechanics.params.match3.allowInvalidSwap",
    false,
  );

  private readonly colors = {
    bgTop: getSetting<string>("theme.colors.backgroundGradientTop", "#060A16"),
    bgBottom: getSetting<string>("theme.colors.backgroundGradientBottom", "#0B1024"),
    panel: getSetting<string>("theme.colors.panel", "rgba(10,20,42,0.68)"),
    boardBg: getSetting<string>("theme.colors.boardBackground", "#111A33"),
    gridLine: getSetting<string>("theme.colors.gridLine", "rgba(39,86,130,0.45)"),
    textPrimary: getSetting<string>("theme.colors.textPrimary", "#D7EBFF"),
    textAccent: getSetting<string>("theme.colors.textAccent", "#00F6FF"),
    iconColor: getSetting<string>("theme.colors.iconColor", "#00F6FF"),
    highlight: getSetting<string>("theme.colors.blockHighlight", "rgba(0,246,255,0.58)"),
    shadow: getSetting<string>("theme.colors.blockShadow", "rgba(0,0,0,0.48)"),
  };

  private readonly title = getSetting<string>("presentation.ui.title", "MEME MATCH");
  private readonly subtitle = getSetting<string>(
    "presentation.ui.subtitle",
    "Swap adjacent memes to match 3+",
  );
  private readonly scoreIcon = getSetting<string>("presentation.ui.scoreIcon", "⚡");
  private readonly ctaText = getSetting<string>("presentation.ui.ctaText", "CHAIN REACTION");

  private state = {
    board: [] as BoardCell[][],
    bag: [] as Array<null>,
    selectedPieceIndex: null as number | null,
    score: 0,
    movesUsed: 0,
    gemProgress: { [this.goal.target]: 0 } as Record<string, number>,
    message: "Tap Start",
    started: false,
    isOver: false,
    didWin: false,
    overlay: {
      visible: true,
      title: "Meme Match-3",
      body: `Collect ${this.goal.count} ${this.goal.target} in ${this.moveLimit} moves.`,
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
      this.state.message = "Swap adjacent memes to create a line of 3.";
      this.notify();
      return;
    }
    if (action.type === "select_piece") {
      // Not used in match3 mode.
      return;
    }
    if (action.type === "place_at") {
      this.selectOrSwap(action.row, action.col);
    }
  }

  getSnapshot(): EliminationSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      targetScore: this.goal.count,
      moveLimit: this.moveLimit,
      bagSize: 0,
      scoreIcon: this.scoreIcon,
      ctaText: this.ctaText,
      title: this.title,
      subtitle: this.subtitle,
      colors: this.colors,
      state: {
        board: this.state.board.map((row) => row.map((cell) => ({ ...cell }))),
        bag: [],
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
      gemTargets: [{ id: this.goal.target, required: this.goal.count }] as GemTarget[],
    };
  }

  private startOrRestart(): void {
    if (this.state.isOver) {
      this.reset();
      return;
    }
    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "Swap adjacent memes.";
    this.notify();
  }

  private reset(emit = true): void {
    this.state.board = this.createSeedBoard();
    this.state.score = 0;
    this.state.movesUsed = 0;
    this.state.selectedPieceIndex = null;
    this.state.gemProgress = { [this.goal.target]: 0 };
    this.state.started = false;
    this.state.isOver = false;
    this.state.didWin = false;
    this.state.message = "Tap Start";
    this.state.overlay = {
      visible: true,
      title: "Meme Match-3",
      body: `Collect ${this.goal.count} ${this.goal.target} in ${this.moveLimit} moves.`,
      buttonText: "Start",
    };
    if (emit) this.notify();
  }

  private selectOrSwap(row: number, col: number): void {
    if (!this.state.started || this.state.isOver) return;
    if (!this.inBounds(row, col)) return;

    const picked = this.index(row, col);
    if (this.state.selectedPieceIndex === null) {
      this.state.selectedPieceIndex = picked;
      this.state.message = "Select adjacent meme to swap.";
      this.notify();
      return;
    }

    const selected = this.fromIndex(this.state.selectedPieceIndex);
    if (!this.isAdjacent(selected.row, selected.col, row, col)) {
      this.state.selectedPieceIndex = picked;
      this.state.message = "Pick adjacent meme.";
      this.notify();
      return;
    }

    this.swapCells(selected.row, selected.col, row, col);
    const firstMatches = this.findMatches();
    if (firstMatches.length === 0 && !this.allowInvalidSwap) {
      this.swapCells(selected.row, selected.col, row, col);
      this.state.selectedPieceIndex = null;
      this.state.message = "No match. Try another swap.";
      this.notify();
      return;
    }

    this.state.selectedPieceIndex = null;
    this.state.movesUsed += 1;
    let combo = 0;
    let totalCleared = 0;
    let totalGoalGain = 0;
    let matches = firstMatches;

    while (matches.length > 0) {
      combo += 1;
      totalGoalGain += this.countGoalHits(matches);
      const cleared = this.clearMatches(matches);
      totalCleared += cleared;
      this.collapseBoard();
      this.refillBoard();
      matches = this.cascadeEnabled ? this.findMatches() : [];
    }

    const comboBonus = combo > 1 ? combo * 30 : 0;
    this.state.score += totalCleared * 10 + comboBonus;
    this.state.gemProgress[this.goal.target] =
      (this.state.gemProgress[this.goal.target] ?? 0) + totalGoalGain;
    if (combo > 1) {
      this.state.message = `COMBO x${combo}!`;
    } else {
      this.state.message = totalCleared > 0 ? "MATCH!" : "Swapped.";
    }

    this.evaluateEndState();
    this.notify();
  }

  private evaluateEndState(): void {
    const reachedGoal =
      (this.state.gemProgress[this.goal.target] ?? 0) >= this.goal.count;
    const noMovesLeft = this.state.movesUsed >= this.moveLimit;

    if (reachedGoal) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.overlay = {
        visible: true,
        title: "LEVEL CLEAR",
        body: `Collected ${this.goal.count} ${this.goal.target}!`,
        buttonText: "Restart",
      };
      return;
    }

    if (noMovesLeft) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = {
        visible: true,
        title: "OUT OF MOVES",
        body: `Need ${this.goal.count} ${this.goal.target}.`,
        buttonText: "Retry",
      };
    }
  }

  private clearMatches(matches: GridPoint[]): number {
    let count = 0;
    for (const point of matches) {
      const cell = this.state.board[point.row][point.col];
      if (!cell.filled) continue;
      this.state.board[point.row][point.col] = this.emptyCell();
      count += 1;
    }
    return count;
  }

  private countGoalHits(matches: GridPoint[]): number {
    let hit = 0;
    for (const point of matches) {
      const cell = this.state.board[point.row][point.col];
      if (cell.color === this.goal.target) hit += 1;
    }
    return hit;
  }

  private collapseBoard(): void {
    for (let col = 0; col < this.cols; col += 1) {
      let write = this.rows - 1;
      for (let row = this.rows - 1; row >= 0; row -= 1) {
        const cell = this.state.board[row][col];
        if (!cell.filled) continue;
        if (write !== row) {
          this.state.board[write][col] = cell;
          this.state.board[row][col] = this.emptyCell();
        }
        write -= 1;
      }
    }
  }

  private refillBoard(): void {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.state.board[row][col].filled) continue;
        this.state.board[row][col] = this.randomCell();
      }
    }
  }

  private findMatches(): GridPoint[] {
    const keySet = new Set<string>();

    // Horizontal
    for (let row = 0; row < this.rows; row += 1) {
      let start = 0;
      while (start < this.cols) {
        const current = this.state.board[row][start];
        if (!current.filled) {
          start += 1;
          continue;
        }
        let end = start + 1;
        while (
          end < this.cols &&
          this.state.board[row][end].filled &&
          this.state.board[row][end].color === current.color
        ) {
          end += 1;
        }
        if (end - start >= 3) {
          for (let col = start; col < end; col += 1) {
            keySet.add(`${row}:${col}`);
          }
        }
        start = end;
      }
    }

    // Vertical
    for (let col = 0; col < this.cols; col += 1) {
      let start = 0;
      while (start < this.rows) {
        const current = this.state.board[start][col];
        if (!current.filled) {
          start += 1;
          continue;
        }
        let end = start + 1;
        while (
          end < this.rows &&
          this.state.board[end][col].filled &&
          this.state.board[end][col].color === current.color
        ) {
          end += 1;
        }
        if (end - start >= 3) {
          for (let row = start; row < end; row += 1) {
            keySet.add(`${row}:${col}`);
          }
        }
        start = end;
      }
    }

    return Array.from(keySet).map((item) => {
      const [row, col] = item.split(":").map(Number);
      return { row, col };
    });
  }

  private createSeedBoard(): BoardCell[][] {
    let attempts = 0;
    while (attempts < 25) {
      attempts += 1;
      const board = Array.from({ length: this.rows }, () =>
        Array.from({ length: this.cols }, () => this.randomCell()),
      );
      this.state.board = board;
      if (this.findMatches().length === 0) return board;
    }
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => this.randomCell()),
    );
  }

  private randomCell(): BoardCell {
    const meme = this.memes[Math.floor(Math.random() * this.memes.length)];
    return {
      filled: true,
      color: meme.id,
      gemId: `m${this.serial++}`,
    };
  }

  private emptyCell(): BoardCell {
    return {
      filled: false,
      color: "",
      gemId: null,
    };
  }

  private swapCells(r1: number, c1: number, r2: number, c2: number): void {
    const a = this.state.board[r1][c1];
    this.state.board[r1][c1] = this.state.board[r2][c2];
    this.state.board[r2][c2] = a;
  }

  private isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  private inBounds(row: number, col: number): boolean {
    return row >= 0 && col >= 0 && row < this.rows && col < this.cols;
  }

  private index(row: number, col: number): number {
    return row * this.cols + col;
  }

  private fromIndex(index: number): GridPoint {
    return {
      row: Math.floor(index / this.cols),
      col: index % this.cols,
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
