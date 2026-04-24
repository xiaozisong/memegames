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

export class BlockBlastKernel {
  constructor() {
    this.id = "blockblast";
    this.listeners = [];
    this.pieceCounter = 0;
    this.effectTick = 0;

    this.gridSize = getSetting("gameplay_grid_size", 8);
    this.rows = getSetting("gameplay_board_rows", this.gridSize);
    this.cols = getSetting("gameplay_board_cols", this.gridSize);
    this.bagSize = getSetting("gameplay_rules_bag_size", 3);
    this.gemSpawnChance = getSetting("gameplay_gem_spawn_chance", 0.2);
    this.scorePerCell = getSetting("gameplay_scoring_per_cell", 10);
    this.scorePerLine = getSetting("gameplay_scoring_per_line", 120);
    this.scorePerGem = getSetting("gameplay_scoring_per_gem", 60);
    this.targetScore = getSetting("gameplay_scoring_target_score", 3000);
    this.initialFilled = buildInitialBoardFilledCells();
    this.rawShapePool = buildShapePool();
    this.shapePool = this.normalizeShapePool(this.rawShapePool);
    this.pieceColors = buildThemePieceColors() ?? ["#3AB8FF", "#8A6CFF", "#41FFD9"];
    this.presentation = {
      uiTemplate: getSetting("presentation_ui_template", "neon-block"),
      animation: {
        clear: getSetting("presentation_animation_clear", "scale-fade"),
        place: getSetting("presentation_animation_place", "snap-scale"),
      },
      interaction: {
        dragPreview: true,
        highlightValid: true,
        ...getSetting("presentation_interaction", {}),
      },
    };
    this.colors = {
      bgTop: getSetting("theme_background_top", "#080A19"),
      bgBottom: getSetting("theme_background_bottom", "#100925"),
      backgroundMedia: getSetting("theme_background_media", getSetting("theme_background_video", "")),
      backgroundMediaType: getSetting("theme_background_media_type", "auto"),
      backgroundVideo: getSetting("theme_background_video", ""),
      backgroundMusic: getSetting("theme_background_music", ""),
      sceneOverlayAlpha: getSetting("theme_scene_overlay_alpha", 0.22),
      sceneOverlayImage: getSetting("theme_scene_overlay_image", ""),
      sceneOverlayImageAlpha: getSetting("theme_scene_overlay_image_alpha", 0.18),
      trayOverlayAlpha: getSetting("theme_tray_overlay_alpha", 0.36),
      trayOverlayImage: getSetting("theme_tray_overlay_image", ""),
      trayOverlayImageAlpha: getSetting("theme_tray_overlay_image_alpha", 0.18),
      boardBg: getSetting("theme_board_bg", "#111A33"),
      boardAlpha: getSetting("theme_board_alpha", 0.92),
      boardRadius: getSetting("theme_board_radius", 22),
      boardMedia: getSetting("theme_board_media", ""),
      boardMediaType: getSetting("theme_board_media_type", "auto"),
      boardMediaAlpha: getSetting("theme_board_media_alpha", 0.24),
      hudPanelBg: getSetting("theme_hud_panel_bg", "#0A1230"),
      hudPanelAlpha: getSetting("theme_hud_panel_alpha", 0.56),
      hudPanelRadius: getSetting("theme_hud_panel_radius", 14),
      hudPanelMedia: getSetting("theme_hud_panel_media", ""),
      hudPanelMediaType: getSetting("theme_hud_panel_media_type", "auto"),
      hudPanelMediaAlpha: getSetting("theme_hud_panel_media_alpha", 0.16),
      hudFontFamily: getSetting("theme_hud_font_family", "Arial"),
      hudLabelColor: getSetting("theme_hud_label_color", "#BFDcff"),
      hudLabelRuleColor: getSetting("theme_hud_label_rule_color", "#A5ADC0"),
      hudValueScoreColor: getSetting("theme_hud_value_score_color", "#7DF7FF"),
      hudValueRuleColor: getSetting("theme_hud_value_rule_color", "#D4E2F8"),
      hudValueBestColor: getSetting("theme_hud_value_best_color", "#AEDFFD"),
      hudLabelFontSize: getSetting("theme_hud_label_font_size", 11),
      hudRuleLabelFontSize: getSetting("theme_hud_rule_label_font_size", 10),
      hudValueScoreFontSize: getSetting("theme_hud_value_score_font_size", 20),
      hudValueRuleFontSize: getSetting("theme_hud_value_rule_font_size", 11),
      hudValueBestFontSize: getSetting("theme_hud_value_best_font_size", 18),
      gridLine: getSetting("theme_grid_line", "rgba(88,130,188,0.35)"),
      blockRadius: getSetting("theme_block_radius", 0.24),
      blockMedia: getSetting("theme_block_media", ""),
      blockMediaType: getSetting("theme_block_media_type", "auto"),
      blockMediaAlpha: getSetting("theme_block_media_alpha", 1),
      pieceColors: buildThemePieceColors() ?? ["#3AB8FF", "#8A6CFF", "#41FFD9", "#5D8BFF"],
      primary: getSetting("theme_primary", "#33BDFF"),
      accent: getSetting("theme_accent", "#8A63FF"),
      glow: getSetting("theme_glow", "neon"),
    };
    this.hudRuleText = getSetting("presentation_hud_rule_text", "拖拽方块，填满行列触发消除");
    this.title = getSetting("presentation_hud_title", "哈基宝石");

    this.gemTargets = this.normalizeGemTargets(buildGemTargets());
    this.state = {
      board: this.createBoard(),
      bag: [],
      selectedPieceIndex: null,
      preview: null,
      score: 0,
      movesUsed: 0,
      gemProgress: Object.fromEntries(this.gemTargets.map((item) => [item.id, 0])),
      message: "点击开始",
      started: false,
      isOver: false,
      didWin: false,
      overlay: createOverlay("哈基宝石", "拖拽底部方块到棋盘中", "开始"),
      effects: this.createEffects(),
    };
    this.resetGame(false);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
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
          placedCells: this.state.effects.placedCells.map((cell) => ({ ...cell })),
          clearedCells: this.state.effects.clearedCells.map((cell) => ({ ...cell })),
          gemBursts: this.state.effects.gemBursts.map((item) => ({ ...item })),
          lineBursts: this.state.effects.lineBursts.map((item) => ({ ...item })),
        },
        danger: this.computeDangerState(),
      },
    };
  }

  dispatch(action) {
    if (action.type === "start_or_restart") return this.startOrRestart();
    if (action.type === "set_relax_hint") return this.setRuleHint();
    if (action.type === "select_piece") return this.selectPiece(action.index);
    if (action.type === "set_preview") return this.setPreview(action);
    if (action.type === "clear_preview") return this.clearPreview();
    if (action.type === "place_at") return this.placeAt(action.row, action.col, action.pieceIndex);
  }

  startOrRestart() {
    if (this.state.isOver) {
      this.resetGame();
      return;
    }
    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "拖拽一个方块到棋盘";
    this.notify();
  }

  setRuleHint() {
    this.state.message = this.hudRuleText;
    this.notify();
  }

  selectPiece(index) {
    if (!this.state.started || this.state.isOver) return;
    if (!this.state.bag[index]) return;
    this.state.selectedPieceIndex = index;
    this.notify();
  }

  setPreview(action) {
    if (!this.state.started || this.state.isOver) return;
    const pieceIndex = Number.isInteger(action.pieceIndex) ? action.pieceIndex : this.state.selectedPieceIndex;
    if (pieceIndex === null || !this.state.bag[pieceIndex]) {
      this.clearPreview();
      return;
    }
    const piece = this.state.bag[pieceIndex];
    const preview = this.buildPreview(piece, action.row, action.col, pieceIndex);
    this.state.preview = preview;
    this.state.effects.invalidPlacement = !preview.valid;
    this.notify();
  }

  clearPreview() {
    this.state.preview = null;
    this.state.effects.invalidPlacement = false;
    this.notify();
  }

  placeAt(anchorRow, anchorCol, inputIndex) {
    if (!this.state.started || this.state.isOver) return;
    const pieceIndex = Number.isInteger(inputIndex) ? inputIndex : this.state.selectedPieceIndex;
    if (pieceIndex === null || !this.state.bag[pieceIndex]) return;

    const selected = this.state.bag[pieceIndex];
    const preview = this.buildPreview(selected, anchorRow, anchorCol, pieceIndex);
    if (!preview.valid) {
      this.state.message = "非法位置";
      this.state.effects = {
        ...this.createEffects(),
        invalidPlacement: true,
      };
      this.notify();
      return;
    }

    const placedCells = [];
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
      this.state.gemProgress[gemId] = (this.state.gemProgress[gemId] ?? 0) + count;
    }

    if (this.state.bag.every((piece) => !piece)) {
      this.refillBag();
    }
    this.state.selectedPieceIndex = this.nextSelectablePieceIndex();

    this.state.message = clearResult.lines > 1 ? `COMBO x${clearResult.lines}` : clearResult.lines === 1 ? "LINE CLEAR" : "PLACED";
    this.state.effects = {
      tick: ++this.effectTick,
      placedCells,
      clearedCells: clearResult.clearedCells,
      clearedLines: clearResult.lines,
      comboText: clearResult.lines > 1 ? `COMBO x${clearResult.lines}` : "",
      gemBursts: clearResult.gemBursts,
      lineBursts: clearResult.lineBursts,
      invalidPlacement: false,
    };
    this.checkEndState();
    this.notify();
  }

  resetGame(emit = true) {
    this.state.board = this.createBoard();
    this.state.score = 0;
    this.state.movesUsed = 0;
    this.state.started = false;
    this.state.isOver = false;
    this.state.didWin = false;
    this.state.preview = null;
    this.state.message = "点击开始";
    this.state.gemProgress = Object.fromEntries(this.gemTargets.map((item) => [item.id, 0]));
    this.state.overlay = createOverlay("哈基宝石", "拖拽底部方块到棋盘中", "开始");
    this.state.effects = this.createEffects();
    this.assignPrefilledCells();
    this.refillBag();
    this.state.selectedPieceIndex = this.nextSelectablePieceIndex();
    if (emit) this.notify();
  }

  createBoard() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({ filled: false, color: this.colors.gridLine, gemId: null })),
    );
  }

  assignPrefilledCells() {
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

  refillBag() {
    this.state.bag = Array.from({ length: this.bagSize }, () => this.createPiece());
  }

  createPiece() {
    const shapeId = this.shapePool[this.randomInt(this.shapePool.length)] ?? "single";
    const shape = SHAPE_LIBRARY[shapeId] ?? SHAPE_LIBRARY.single;
    return {
      id: `${shapeId}-${this.pieceCounter++}`,
      shape: shapeId,
      color: this.randomPieceColor(),
      cells: shape.map(([row, col]) => ({
        row,
        col,
        gemId: this.randomGemId(),
      })),
    };
  }

  clearCompletedLines() {
    const result = lineClearSystem({
      grid: this.state.board,
      axes: ["row", "column"],
      isCellFilled: (cell) => cell.filled,
    });
    const gemGain = {};
    const gemBursts = [];
    const clearedCells = [];
    const lineBursts = [];

    for (const line of result.clearedLines) {
      const gemType = this.pickLineGemType(line.axis, line.index);
      lineBursts.push({
        axis: line.axis,
        index: line.index,
        gemType,
      });
    }

    for (const { row, col } of result.clearedPositions) {
      const gemId = this.state.board[row][col].gemId;
      if (gemId) {
        gemGain[gemId] = (gemGain[gemId] ?? 0) + 1;
        gemBursts.push({ row, col, type: gemId });
      }
      this.state.board[row][col] = { filled: false, color: this.colors.gridLine, gemId: null };
      clearedCells.push({ row, col });
    }

    return {
      lines: result.clearedLines.length,
      gemGain,
      gemBursts,
      clearedCells,
      lineBursts,
    };
  }

  checkEndState() {
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

  canAnyPieceBePlaced() {
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

  buildPreview(piece, anchorRow, anchorCol, pieceIndex) {
    const cells = [];
    let valid = true;
    for (const cell of piece.cells) {
      const row = anchorRow + cell.row;
      const col = anchorCol + cell.col;
      cells.push({ row, col });
      if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) valid = false;
      else if (this.state.board[row][col].filled) valid = false;
    }
    return {
      pieceIndex,
      valid,
      anchor: { row: anchorRow, col: anchorCol },
      cells,
    };
  }

  createEffects() {
    return {
      tick: this.effectTick,
      placedCells: [],
      clearedCells: [],
      clearedLines: 0,
      comboText: "",
      gemBursts: [],
      lineBursts: [],
      invalidPlacement: false,
    };
  }

  pickLineGemType(axis, index) {
    const counter = {};
    if (axis === "row") {
      for (let col = 0; col < this.cols; col += 1) {
        const gemId = this.state.board[index][col].gemId;
        if (gemId) counter[gemId] = (counter[gemId] ?? 0) + 1;
      }
    } else if (axis === "column") {
      for (let row = 0; row < this.rows; row += 1) {
        const gemId = this.state.board[row][index].gemId;
        if (gemId) counter[gemId] = (counter[gemId] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  }

  computeDangerState() {
    const available = this.countAvailablePlacements();
    return {
      availablePlacements: available,
      isCritical: this.state.started && !this.state.isOver && available > 0 && available <= 2,
    };
  }

  countAvailablePlacements() {
    let count = 0;
    for (const piece of this.state.bag) {
      if (!piece) continue;
      for (let row = 0; row < this.rows; row += 1) {
        for (let col = 0; col < this.cols; col += 1) {
          if (this.buildPreview(piece, row, col, 0).valid) {
            count += 1;
          }
        }
      }
    }
    return count;
  }

  normalizeShapePool(rawShapes) {
    const normalized = rawShapes
      .map((item) => (typeof item === "string" ? item : item?.type))
      .map((item) => normalizeShapeType(item))
      .filter((item) => Boolean(SHAPE_LIBRARY[item]));
    return normalized.length > 0 ? normalized : ["single", "line3", "L", "square"];
  }

  normalizeGemTargets(raw) {
    return raw
      .map((item, index) => ({
        id: item.id ?? item.type ?? `gem-${index}`,
        required: item.required ?? item.count ?? 0,
      }))
      .filter((item) => item.required > 0);
  }

  randomGemId() {
    if (this.gemTargets.length === 0 || Math.random() > this.gemSpawnChance) return null;
    return this.gemTargets[this.randomInt(this.gemTargets.length)].id;
  }

  randomPieceColor() {
    return this.pieceColors[this.randomInt(this.pieceColors.length)];
  }

  nextSelectablePieceIndex() {
    const index = this.state.bag.findIndex(Boolean);
    return index >= 0 ? index : null;
  }

  randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
