import { getSetting } from "../config";
import {
  Direction,
  Game2048Snapshot,
  GameKernel,
  KernelAction,
  KernelListener,
  OverlayState,
} from "../core/contracts";

const SIZE = 4;
const WIN_VALUE = 2048;
const BEST_SCORE_KEY = "game-2048-best-score";

type GameState = {
  board: number[][];
  score: number;
  bestScore: number;
  started: boolean;
  gameOver: boolean;
  hasWon: boolean;
  statusText: string;
  overlay: OverlayState;
};

type MoveResult = {
  moved: boolean;
  scoreGain: number;
};

export class Game2048Kernel implements GameKernel {
  id = "classic-2048";
  private listeners: KernelListener[] = [];
  private state: GameState = {
    board: this.createEmptyBoard(),
    score: 0,
    bestScore: 0,
    started: false,
    gameOver: false,
    hasWon: false,
    statusText: "",
    overlay: this.createStartOverlay(),
  };

  constructor() {
    this.state.bestScore = this.loadBestScore();
    this.resetRound();
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
      this.resetRound();
      this.notify();
      return;
    }

    if (action.type === "dismiss_overlay") {
      this.dismissOverlay();
      this.notify();
      return;
    }

    if (action.type === "show_swipe_hint") {
      if (this.state.overlay.visible || this.state.gameOver) return;
      this.state.statusText = this.text("ui.text.statusSwipeHint", "请滑动控制方块");
      this.notify();
      return;
    }

    if (action.type === "move") {
      if (!this.canAcceptMove()) return;
      this.applyMove(action.direction);
    }
  }

  getSnapshot(): Game2048Snapshot {
    return {
      size: SIZE,
      board: this.state.board.map((row) => [...row]),
      score: this.state.score,
      bestScore: this.state.bestScore,
      started: this.state.started,
      gameOver: this.state.gameOver,
      hasWon: this.state.hasWon,
      statusText: this.state.statusText,
      overlay: { ...this.state.overlay },
    };
  }

  private applyMove(direction: Direction): void {
    const board = this.state.board.map((row) => [...row]);
    const result = this.moveBoard(board, direction);

    if (!result.moved) {
      this.state.statusText = this.text("ui.text.statusInvalid", "该方向无法移动");
      this.notify();
      return;
    }

    this.state.board = board;
    this.state.score += result.scoreGain;
    this.updateBestScore();
    this.spawnRandomTile(this.state.board);
    this.refreshResultState();
    this.notify();
  }

  private refreshResultState(): void {
    if (!this.state.hasWon && this.state.board.some((row) => row.some((cell) => cell >= WIN_VALUE))) {
      this.state.hasWon = true;
      this.state.statusText = this.text("ui.text.statusWin", "你已达成 2048，继续挑战更高分！");
      return;
    }

    if (this.canMove(this.state.board)) {
      this.state.statusText = this.text("ui.text.statusReady", "滑动或方向键移动方块");
      return;
    }

    this.state.gameOver = true;
    this.state.statusText = this.text("ui.text.statusGameOver", "游戏结束，按 R 重新开始");
    this.state.overlay = {
      visible: true,
      mode: "end",
      title: this.text("ui.text.modalEndTitle", "游戏结束"),
      body: `本局得分 ${this.state.score}，最高 ${this.state.bestScore}`,
      buttonText: this.text("ui.text.modalEndButton", "点击再来一局"),
    };
  }

  private dismissOverlay(): void {
    if (!this.state.overlay.visible) return;
    if (this.state.overlay.mode === "end") {
      this.resetRound();
      return;
    }
    this.state.overlay.visible = false;
    this.state.started = true;
    this.state.statusText = this.text("ui.text.statusReady", "滑动或方向键移动方块");
  }

  private canAcceptMove(): boolean {
    return this.state.started && !this.state.gameOver && !this.state.overlay.visible;
  }

  private resetRound(): void {
    this.state.board = this.createEmptyBoard();
    this.state.score = 0;
    this.state.started = false;
    this.state.gameOver = false;
    this.state.hasWon = false;
    this.spawnRandomTile(this.state.board);
    this.spawnRandomTile(this.state.board);
    this.state.statusText = this.text("ui.text.statusReady", "滑动或方向键移动方块");
    this.state.overlay = this.createStartOverlay();
  }

  private createStartOverlay(): OverlayState {
    return {
      visible: true,
      mode: "start",
      title: this.text("ui.text.modalStartTitle", "2048"),
      body: this.text("ui.text.modalStartDesc", "滑动屏幕或使用方向键，合并数字并冲击更高分"),
      buttonText: this.text("ui.text.modalStartButton", "点击开始"),
    };
  }

  private moveBoard(board: number[][], direction: Direction): MoveResult {
    let moved = false;
    let scoreGain = 0;

    if (direction === "left" || direction === "right") {
      for (let row = 0; row < SIZE; row += 1) {
        const line = direction === "left" ? board[row] : [...board[row]].reverse();
        const merged = this.compactLine(line);
        const next = direction === "left" ? merged.line : [...merged.line].reverse();
        if (!this.sameLine(board[row], next)) moved = true;
        board[row] = next;
        scoreGain += merged.scoreGain;
      }
      return { moved, scoreGain };
    }

    for (let col = 0; col < SIZE; col += 1) {
      const line = [];
      for (let row = 0; row < SIZE; row += 1) line.push(board[row][col]);
      const source = direction === "up" ? line : [...line].reverse();
      const merged = this.compactLine(source);
      const next = direction === "up" ? merged.line : [...merged.line].reverse();
      if (!this.sameLine(line, next)) moved = true;
      for (let row = 0; row < SIZE; row += 1) board[row][col] = next[row];
      scoreGain += merged.scoreGain;
    }

    return { moved, scoreGain };
  }

  private compactLine(line: number[]): { line: number[]; scoreGain: number } {
    const filtered = line.filter((value) => value !== 0);
    const out: number[] = [];
    let scoreGain = 0;

    for (let i = 0; i < filtered.length; i += 1) {
      const current = filtered[i];
      const next = filtered[i + 1];
      if (current !== 0 && current === next) {
        const merged = current * 2;
        out.push(merged);
        scoreGain += merged;
        i += 1;
      } else {
        out.push(current);
      }
    }

    while (out.length < SIZE) out.push(0);
    return { line: out, scoreGain };
  }

  private canMove(board: number[][]): boolean {
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const value = board[row][col];
        if (value === 0) return true;
        if (col < SIZE - 1 && value === board[row][col + 1]) return true;
        if (row < SIZE - 1 && value === board[row + 1][col]) return true;
      }
    }
    return false;
  }

  private spawnRandomTile(board: number[][]): void {
    const empty: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (board[row][col] === 0) empty.push({ row, col });
      }
    }
    if (empty.length === 0) return;
    const target = empty[Math.floor(Math.random() * empty.length)];
    board[target.row][target.col] = Math.random() < 0.9 ? 2 : 4;
  }

  private sameLine(a: number[], b: number[]): boolean {
    for (let i = 0; i < SIZE; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private createEmptyBoard(): number[][] {
    return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  }

  private updateBestScore(): void {
    if (this.state.score <= this.state.bestScore) return;
    this.state.bestScore = this.state.score;
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(this.state.bestScore));
    } catch {
      // Ignore storage write errors.
    }
  }

  private loadBestScore(): number {
    try {
      const raw = window.localStorage.getItem(BEST_SCORE_KEY);
      const value = Number(raw ?? "0");
      return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    } catch {
      return 0;
    }
  }

  private text(path: string, fallback: string): string {
    const value = getSetting(path, fallback);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
