// TypeScript reference mirror for tooling and comparison.
// Current no-build runtime uses `kernels/blockBlastKernel.js`.
// Keep this file in sync only when you intentionally want a TS mirror of the active JS kernel.

import {
  buildGemTargets,
  buildInitialBoardFilledCells,
  buildShapePool,
  buildThemePieceColors,
  getSetting,
} from "../config.js";
import { createOverlay } from "../core/contracts.js";
import { lineClearSystem } from "../systems/lineClearSystem.js";
import { SHAPE_LIBRARY, normalizeShapeType } from "./shapeLibrary.js";

type GemTarget = { id: string; required: number };
type PieceCell = { row: number; col: number; gemId: string | null };
type Piece = { id: string; shape: string; color: string; cells: PieceCell[] };
type BoardCell = { filled: boolean; color: string; gemId: string | null };
type EffectCell = { row: number; col: number };
type GemBurst = { row: number; col: number; type: string };

export class BlockPlacementKernel {
  id = "blockblast";
  private listeners: Array<(snapshot: unknown) => void> = [];
  private pieceCounter = 0;
  private effectTick = 0;

  private gridSize = getSetting("gameplay_grid_size", 8);
  private rows = getSetting("gameplay_board_rows", this.gridSize);
  private cols = getSetting("gameplay_board_cols", this.gridSize);
  private bagSize = getSetting("gameplay_rules_bag_size", 3);
  private gemSpawnChance = getSetting("gameplay_gem_spawn_chance", 0.2);
  private scorePerCell = getSetting("gameplay_scoring_per_cell", 10);
  private scorePerLine = getSetting("gameplay_scoring_per_line", 120);
  private scorePerGem = getSetting("gameplay_scoring_per_gem", 60);
  private targetScore = getSetting("gameplay_scoring_target_score", 3000);
  private initialFilled = buildInitialBoardFilledCells() as Array<Record<string, any>>;
  private rawShapePool = buildShapePool();
  private shapePool = this.normalizeShapePool(this.rawShapePool);
  private pieceColors = buildThemePieceColors() ?? ["#3AB8FF", "#8A6CFF", "#41FFD9"];
  private presentation = {
    uiTemplate: getSetting("presentation_ui_template", "neon-block"),
    animation: {
      clear: getSetting("presentation_animation_clear", "scale-fade"),
      place: getSetting("presentation_animation_place", "snap-scale"),
    },
    interaction: { dragPreview: true, highlightValid: true, ...getSetting("presentation_interaction", {}) },
  };
  private colors = {
    bgTop: getSetting("theme_background_top", "#080A19"),
    bgBottom: getSetting("theme_background_bottom", "#100925"),
    backgroundMedia: getSetting("theme_background_media", getSetting("theme_background_video", "")),
    backgroundMediaType: getSetting("theme_background_media_type", "auto"),
    boardBg: getSetting("theme_board_bg", "#111A33"),
    gridLine: getSetting("theme_grid_line", "rgba(88,130,188,0.35)"),
    primary: getSetting("theme_primary", "#33BDFF"),
    accent: getSetting("theme_accent", "#8A63FF"),
    glow: getSetting("theme_glow", "neon"),
  };
  private hudRuleText = getSetting("presentation_hud_rule_text", "拖拽方块，填满行列触发消除");
  private title = getSetting("presentation_hud_title", "BLOCK PLACEMENT");
  private gemTargets = this.normalizeGemTargets(buildGemTargets());

  private state = {
    board: this.createBoard(),
    bag: [] as Array<Piece | null>,
    selectedPieceIndex: null as number | null,
    preview: null as null | {
      pieceIndex: number;
      valid: boolean;
      anchor: { row: number; col: number };
      cells: EffectCell[];
    },
    score: 0,
    movesUsed: 0,
    gemProgress: Object.fromEntries(this.gemTargets.map((item) => [item.id, 0])) as Record<string, number>,
    message: "点击开始",
    started: false,
    isOver: false,
    didWin: false,
    overlay: createOverlay("BLOCK PLACEMENT", "拖拽底部方块到棋盘中", "开始"),
    effects: this.createEffects(),
  };

  constructor() {
    this.resetGame(false);
  }

  subscribe(listener: (snapshot: unknown) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action: Record<string, any>): void {
    if (action.type === "start_or_restart") return this.startOrRestart();
    if (action.type === "set_relax_hint") return this.setRuleHint();
    if (action.type === "select_piece") return this.selectPiece(action.index);
    if (action.type === "set_preview") return this.setPreview(action);
    if (action.type === "clear_preview") return this.clearPreview();
    if (action.type === "place_at") return this.placeAt(action.row, action.col, action.pieceIndex);
  }

  getSnapshot() {
    return {
      rows: this.rows,
      cols: this.cols,
      title: this.title,
      hudRuleText: this.hudRuleText,
      targetScore: this.targetScore,
      scoreIcon: "SCORE",
      ctaText: "NEON BLOCK",
      presentation: {
        uiTemplate: this.presentation.uiTemplate,
        animation: { ...this.presentation.animation },
        interaction: { ...this.presentation.interaction },
      },
      colors: { ...this.colors },
      gemTargets: this.gemTargets.map((item) => ({ ...item })),
      state: {
        board: this.state.board.map((row) => row.map((cell) => ({ ...cell }))),
        bag: this.state.bag.map((piece) => (piece ? { ...piece, cells: piece.cells.map((cell) => ({ ...cell })) } : null)),
        selectedPieceIndex: this.state.selectedPieceIndex,
        preview: this.state.preview
          ? {
              pieceIndex: this.state.preview.pieceIndex,
              valid: this.state.preview.valid,
              anchor: { ...this.state.preview.anchor },
              cells: this.state.preview.cells.map((cell) => ({ ...cell })),
            }
          : null,
        score: this.state.score,
        movesUsed: this.state.movesUsed,
        gemProgress: { ...this.state.gemProgress },
        message: this.state.message,
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        overlay: { ...this.state.overlay },
        effects: {
          ...this.state.effects,
          placedCells: this.state.effects.placedCells.map((cell: EffectCell) => ({ ...cell })),
          clearedCells: this.state.effects.clearedCells.map((cell: EffectCell) => ({ ...cell })),
          gemBursts: this.state.effects.gemBursts.map((item: GemBurst) => ({ ...item })),
        },
      },
    };
  }

  private startOrRestart() {
    if (this.state.isOver) {
      this.resetGame();
      return;
    }
    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "拖拽一个方块到棋盘";
    this.notify();
  }

  private setRuleHint() {
    this.state.message = this.hudRuleText;
    this.notify();
  }

  private selectPiece(index: number) {
    if (!this.state.started || this.state.isOver) return;
    if (!this.state.bag[index]) return;
    this.state.selectedPieceIndex = index;
    this.notify();
  }

  private setPreview(action: Record<string, any>) {
    if (!this.state.started || this.state.isOver) return;
    const pieceIndex = Number.isInteger(action.pieceIndex) ? action.pieceIndex : this.state.selectedPieceIndex;
    if (pieceIndex === null || !this.state.bag[pieceIndex]) {
      this.clearPreview();
      return;
    }
    const piece = this.state.bag[pieceIndex]!;
    const preview = this.buildPreview(piece, action.row, action.col, pieceIndex);
    this.state.preview = preview;
    this.state.effects.invalidPlacement = !preview.valid;
    this.notify();
  }

  private clearPreview() {
    this.state.preview = null;
    this.state.effects.invalidPlacement = false;
    this.notify();
  }

  private placeAt(anchorRow: number, anchorCol: number, inputIndex?: number) {
    if (!this.state.started || this.state.isOver) return;
    const maybePieceIndex = Number.isInteger(inputIndex) ? inputIndex : this.state.selectedPieceIndex;
    if (typeof maybePieceIndex !== "number") return;
    const pieceIndex = maybePieceIndex;
    const selected = this.state.bag[pieceIndex];
    if (!selected) return;
    const preview = this.buildPreview(selected, anchorRow, anchorCol, pieceIndex);
    if (!preview.valid) {
      this.state.message = "非法位置";
      this.state.effects = { ...this.createEffects(), invalidPlacement: true };
      this.notify();
      return;
    }

    const placedCells: EffectCell[] = [];
    for (const cell of selected.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      this.state.board[row][col] = { filled: true, color: selected.color, gemId: cell.gemId ?? null };
      placedCells.push({ row, col });
    }

    this.state.bag[pieceIndex] = null;
    this.state.selectedPieceIndex = this.nextSelectablePieceIndex();
    this.state.movesUsed += 1;
    this.state.score += selected.cells.length * this.scorePerCell;
    this.state.preview = null;

    const clearResult = this.clearCompletedLines();
    this.state.score += clearResult.lines * this.scorePerLine;
    this.state.score += clearResult.gemBursts.length * this.scorePerGem;
    for (const [gemId, count] of Object.entries(clearResult.gemGain)) {
      this.state.gemProgress[gemId] = (this.state.gemProgress[gemId] ?? 0) + Number(count);
    }

    if (this.state.bag.every((piece) => !piece)) {
      this.refillBag();
    }
    this.state.selectedPieceIndex = this.nextSelectablePieceIndex();
    this.state.message =
      clearResult.lines > 1 ? `COMBO x${clearResult.lines}` : clearResult.lines === 1 ? "LINE CLEAR" : "PLACED";

    this.state.effects = {
      tick: ++this.effectTick,
      placedCells,
      clearedCells: clearResult.clearedCells,
      clearedLines: clearResult.lines,
      comboText: clearResult.lines > 1 ? `COMBO x${clearResult.lines}` : "",
      gemBursts: clearResult.gemBursts,
      invalidPlacement: false,
    };
    this.checkEndState();
    this.notify();
  }

  private resetGame(emit = true) {
    this.state.board = this.createBoard();
    this.state.score = 0;
    this.state.movesUsed = 0;
    this.state.started = false;
    this.state.isOver = false;
    this.state.didWin = false;
    this.state.preview = null;
    this.state.message = "点击开始";
    this.state.gemProgress = Object.fromEntries(this.gemTargets.map((item) => [item.id, 0]));
    this.state.overlay = createOverlay("BLOCK PLACEMENT", "拖拽底部方块到棋盘中", "开始");
    this.state.effects = this.createEffects();
    this.assignPrefilledCells();
    this.refillBag();
    this.state.selectedPieceIndex = this.nextSelectablePieceIndex();
    if (emit) this.notify();
  }

  private createBoard(): BoardCell[][] {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({ filled: false, color: this.colors.gridLine, gemId: null })),
    );
  }

  private assignPrefilledCells() {
    for (const item of this.initialFilled) {
      if (item.row < 0 || item.col < 0 || item.row >= this.rows || item.col >= this.cols) continue;
      if (item.filled === false || item.type === "empty") continue;
      this.state.board[item.row][item.col] = {
        filled: true,
        color: item.color ?? this.randomPieceColor(),
        gemId: item.gemType ?? item.gemId ?? null,
      };
    }
  }

  private refillBag() {
    this.state.bag = Array.from({ length: this.bagSize }, () => this.createPiece());
  }

  private createPiece(): Piece {
    const shapeId = this.shapePool[this.randomInt(this.shapePool.length)] ?? "single";
    const shape = SHAPE_LIBRARY[shapeId] ?? SHAPE_LIBRARY.single;
    return {
      id: `${shapeId}-${this.pieceCounter++}`,
      shape: shapeId,
      color: this.randomPieceColor(),
      cells: shape.map(([row, col]: [number, number]) => ({
        row,
        col,
        gemId: this.randomGemId(),
      })),
    };
  }

  private clearCompletedLines() {
    const result = lineClearSystem({
      grid: this.state.board,
      axes: ["row", "column"],
      isCellFilled: (cell: BoardCell) => cell.filled,
    });

    const gemGain: Record<string, number> = {};
    const gemBursts: GemBurst[] = [];
    const clearedCells: EffectCell[] = [];
    for (const { row, col } of result.clearedPositions) {
      const gemId = this.state.board[row][col].gemId;
      if (gemId) {
        gemGain[gemId] = (gemGain[gemId] ?? 0) + 1;
        gemBursts.push({ row, col, type: gemId });
      }
      this.state.board[row][col] = { filled: false, color: this.colors.gridLine, gemId: null };
      clearedCells.push({ row, col });
    }
    return { lines: result.clearedLines.length, gemGain, gemBursts, clearedCells };
  }

  private checkEndState() {
    const completedGemTargets = this.gemTargets.every((target) => (this.state.gemProgress[target.id] ?? 0) >= target.required);
    if (completedGemTargets && this.state.score >= this.targetScore) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.overlay = createOverlay("YOU WIN", "目标完成，继续挑战更高分", "再来一局");
      return;
    }
    if (!this.canAnyPieceBePlaced()) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = createOverlay("GAME OVER", "没有可放置的方块了", "重新开始");
    }
  }

  private canAnyPieceBePlaced() {
    for (const piece of this.state.bag) {
      if (!piece) continue;
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.cols; col += 1) {
          const preview = this.buildPreview(piece, row, col, 0);
          if (preview.valid) return true;
        }
      }
    }
    return false;
  }

  private buildPreview(piece: Piece, anchorRow: number, anchorCol: number, pieceIndex: number) {
    const cells: EffectCell[] = [];
    let valid = true;
    for (const cell of piece.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      cells.push({ row, col });
      if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) valid = false;
      else if (this.state.board[row][col].filled) valid = false;
    }
    return { pieceIndex, valid, anchor: { row: anchorRow, col: anchorCol }, cells };
  }

  private createEffects() {
    return {
      tick: this.effectTick,
      placedCells: [] as EffectCell[],
      clearedCells: [] as EffectCell[],
      clearedLines: 0,
      comboText: "",
      gemBursts: [] as GemBurst[],
      invalidPlacement: false,
    };
  }

  private normalizeShapePool(rawShapes: any[]): string[] {
    const normalized = rawShapes
      .map((item) => (typeof item === "string" ? item : item?.type))
      .map((item) => normalizeShapeType(item))
      .filter((item) => Boolean(SHAPE_LIBRARY[item]));
    return normalized.length > 0 ? normalized : ["single", "line3", "L", "square"];
  }

  private normalizeGemTargets(raw: any[]): GemTarget[] {
    return raw
      .map((item, index) => ({
        id: item.id ?? item.type ?? `gem-${index}`,
        required: item.required ?? item.count ?? 0,
      }))
      .filter((item) => item.required > 0);
  }

  private randomGemId() {
    if (this.gemTargets.length === 0 || Math.random() > this.gemSpawnChance) return null;
    return this.gemTargets[this.randomInt(this.gemTargets.length)].id;
  }

  private randomPieceColor() {
    return this.pieceColors[this.randomInt(this.pieceColors.length)];
  }

  private nextSelectablePieceIndex() {
    const index = this.state.bag.findIndex(Boolean);
    return index >= 0 ? index : null;
  }

  private randomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  private notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
