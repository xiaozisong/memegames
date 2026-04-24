import { buildPrimaryGoal, buildTileDefinitions, getSetting } from "../config.js";
import { createOverlay } from "../core/contracts.js";
import {
  areAdjacent,
  boardToSnapshot,
  collapseBoard,
  createInitialBoard,
  createSeededRandom,
  shuffleBoardKinds,
  swapCells,
} from "./systems/boardSystem.js";
import { applyGoalDelta, createGoalState, isGoalComplete, toGoalSnapshot } from "./systems/goalSystem.js";
import { findMatches, hasPossibleMove, removeMatchedPositions } from "./systems/matchSystem.js";

export class Match3Kernel {
  constructor() {
    this.id = "match3";
    this.listeners = [];
    this.effectTick = 0;
    this.tileSerial = 0;

    this.rows = Number(getSetting("gameplay_board_rows", 8));
    this.cols = Number(getSetting("gameplay_board_cols", 8));
    this.matchMin = Number(getSetting("gameplay_match_min", 3));
    this.moveLimit = Number(getSetting("gameplay_move_limit", 28));
    this.initialLevelIndex = Number(getSetting("gameplay_level_index", 1));
    this.levelIndex = this.initialLevelIndex;
    this.scorePerTile = Number(getSetting("gameplay_score_per_tile", 35));
    this.scoreComboBonus = Number(getSetting("gameplay_score_combo_bonus", 90));
    this.seed = Number(getSetting("gameplay_spawn_seed", 0));
    this.random = createSeededRandom(this.seed);

    this.tileDefs = buildTileDefinitions();
    this.tileKinds = Math.max(3, Math.min(Number(getSetting("gameplay_tile_kinds", this.tileDefs.length || 5)), this.tileDefs.length || 5));
    this.activeTileDefs = this.tileDefs.slice(0, this.tileKinds);
    this.tileDefsById = Object.fromEntries(this.activeTileDefs.map((item) => [item.id, item]));
    this.goalTemplate = buildPrimaryGoal();

    this.title = getSetting("presentation_hud_title", "Emoji Meme Match");
    this.subtitle = getSetting("presentation_hud_subtitle", "交换相邻表情，完成目标收集");

    this.colors = {
      bg: getSetting("theme_bg", "oklch(0.18 0.05 280)"),
      grid: getSetting("theme_grid", "oklch(0.28 0.08 285)"),
      backgroundGridSmall: getSetting("theme_background_grid_small", "oklch(0.38 0.10 285)"),
      backgroundGridLarge: getSetting("theme_background_grid_large", "oklch(0.72 0.19 300)"),
      uiCard: getSetting("theme_ui_card", "oklch(0.12 0.03 260)"),
      text: getSetting("theme_text", "oklch(0.95 0.02 260)"),
      primary: getSetting("theme_primary", "oklch(0.75 0.18 260)"),
      accent: getSetting("theme_accent", "oklch(0.75 0.18 340)"),
      backgroundTop: getSetting("theme_background_top", "oklch(0.18 0.05 280)"),
      backgroundBottom: getSetting("theme_background_bottom", "oklch(0.30 0.08 285)"),
      backgroundMedia: getSetting("presentation_background_media", ""),
      backgroundMediaType: getSetting("presentation_background_media_type", "none"),
      backgroundMediaOpacity: Number(getSetting("presentation_background_media_opacity", 0.34)),
      boardBg: getSetting("theme_board_bg", "oklch(0.12 0.03 260)"),
      boardAlpha: Number(getSetting("theme_board_alpha", 0.9)),
      boardRadius: Number(getSetting("theme_board_radius", 28)),
      gridLine: getSetting("theme_grid_line", "oklch(0.28 0.08 285)"),
      panelBg: getSetting("theme_panel_bg", "oklch(0.12 0.03 260)"),
      panelAlpha: Number(getSetting("theme_panel_alpha", 0.86)),
      textPrimary: getSetting("theme_text_primary", "oklch(0.95 0.02 260)"),
      textSecondary: getSetting("theme_text_secondary", "oklch(0.84 0.03 260)"),
      buttonBg: getSetting("theme_button_bg", "oklch(0.75 0.18 260)"),
      buttonText: getSetting("theme_button_text", "oklch(0.98 0.01 260)"),
    };

    this.presentation = {
      swapDurationMs: Number(getSetting("presentation_swap_duration_ms", 150)),
      matchPopDurationMs: Number(getSetting("presentation_match_pop_duration_ms", 220)),
      matchFadeDurationMs: Number(getSetting("presentation_match_fade_duration_ms", 180)),
      dropDurationMs: Number(getSetting("presentation_drop_duration_ms", 320)),
      cascadeDelayMs: Number(getSetting("presentation_cascade_delay_ms", 120)),
      boardVerticalBias: Number(getSetting("presentation_board_vertical_bias", 0.2)),
      hudBoardGap: Number(getSetting("presentation_hud_board_gap", 12)),
      hudTitleFontSize: Number(getSetting("presentation_hud_title_font_size", 40)),
      hudLabelFontSize: Number(getSetting("presentation_hud_label_font_size", 12)),
      hudValueFontSize: Number(getSetting("presentation_hud_value_font_size", 24)),
      hudGoalFontSize: Number(getSetting("presentation_hud_goal_font_size", 18)),
      backgroundMusic: getSetting("presentation_background_music", ""),
      backgroundMusicVolume: Number(getSetting("presentation_background_music_volume", 0.42)),
      clearSound: getSetting("presentation_clear_sound", ""),
      clearSoundVolume: Number(getSetting("presentation_clear_sound_volume", 0.8)),
      backgroundMediaFit: getSetting("presentation_background_media_fit", "cover"),
      backgroundMediaPosition: getSetting("presentation_background_media_position", "center center"),
      backgroundSmallGridSpacing: Number(getSetting("presentation_background_small_grid_spacing", 28)),
      backgroundLargeGridSpacing: Number(getSetting("presentation_background_large_grid_spacing", 72)),
      backgroundGridSkew: Number(getSetting("presentation_background_grid_skew", 0.16)),
      backgroundSmallGridAlpha: Number(getSetting("presentation_background_small_grid_alpha", 0.08)),
      backgroundLargeGridAlpha: Number(getSetting("presentation_background_large_grid_alpha", 0.18)),
      backgroundGlowAlpha: Number(getSetting("presentation_background_glow_alpha", 0.18)),
    };

    this.state = this.createEmptyState();
    this.resetGame(false);
  }

  createEmptyState(options = {}) {
    const showOverlay = options.showOverlay ?? true;
    const started = options.started ?? false;
    const levelGoals = createGoalState(this.buildGoalsForLevel(this.levelIndex));
    const overlay = createOverlay(
      getSetting("presentation_overlay_title", "Emoji Meme Match"),
      getSetting("presentation_overlay_body", "点击开始，使用有限步数完成表情目标。支持点击或拖拽交换相邻元素。"),
      getSetting("presentation_overlay_button_text", "开始游戏"),
    );
    overlay.visible = showOverlay;
    return {
      board: [],
      score: 0,
      movesUsed: 0,
      movesRemaining: this.moveLimit,
      started,
      isOver: false,
      didWin: false,
      message: started ? `LEVEL ${this.levelIndex} 开始！` : "点击开始，完成 GOAL 目标。",
      overlay,
      goal: levelGoals,
      effects: this.createEmptyEffects(),
    };
  }

  createEmptyEffects() {
    return {
      tick: this.effectTick,
      invalidSwap: null,
      swap: null,
      steps: [],
      comboCount: 0,
      scoreDelta: 0,
      goalDelta: 0,
      reshuffled: false,
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  dispatch(action) {
    if (!action || typeof action !== "object") return;
    if (action.type === "start_or_restart") {
      if (this.state.isOver) {
        if (this.state.didWin) {
          this.levelIndex += 1;
          this.resetGame(true, { showOverlay: false, started: true });
        } else {
          this.levelIndex = this.initialLevelIndex;
          this.resetGame(true, { showOverlay: true, started: false });
        }
        return;
      }
      this.state.started = true;
      this.state.overlay.visible = false;
      this.state.message = "交换相邻表情，制造连锁消除。";
      this.notify();
      return;
    }

    if (action.type === "try_swap") {
      this.trySwap(action.from, action.to);
    }
  }

  trySwap(from, to) {
    if (!this.state.started || this.state.isOver) return;
    if (!areAdjacent(from, to)) return;
    if (this.state.movesRemaining <= 0) return;
    if (!this.inBounds(from.row, from.col) || !this.inBounds(to.row, to.col)) return;

    const source = this.state.board[from.row][from.col];
    const target = this.state.board[to.row][to.col];
    if (!source || !target) return;

    const swapMeta = {
      from: { ...from },
      to: { ...to },
      ids: [source.id, target.id],
      kinds: [source.kind, target.kind],
    };

    const testBoard = boardToSnapshot(this.state.board);
    swapCells(testBoard, from, to);
    const firstMatches = findMatches(testBoard, this.matchMin);

    if (firstMatches.positions.length === 0) {
      this.state.message = "没有形成消除";
      this.state.effects = {
        ...this.createEmptyEffects(),
        tick: ++this.effectTick,
        invalidSwap: swapMeta,
      };
      this.notify();
      return;
    }

    swapCells(this.state.board, from, to);
    this.state.movesUsed += 1;
    this.state.movesRemaining = Math.max(0, this.state.movesRemaining - 1);

    const effects = {
      ...this.createEmptyEffects(),
      tick: ++this.effectTick,
      swap: swapMeta,
      steps: [],
    };

    let cascadeIndex = 0;
    let totalScoreDelta = 0;
    let totalGoalDelta = 0;

    while (true) {
      const matches = findMatches(this.state.board, this.matchMin);
      if (matches.positions.length === 0) break;

      cascadeIndex += 1;
      const removed = removeMatchedPositions(this.state.board, matches.positions);
      const goalDelta = applyGoalDelta(this.state.goal, removed);
      const scoreGain =
        removed.length * this.scorePerTile + (cascadeIndex > 1 ? (cascadeIndex - 1) * this.scoreComboBonus : 0);

      totalScoreDelta += scoreGain;
      totalGoalDelta += goalDelta;
      this.state.score += scoreGain;

      effects.steps.push({
        type: "clear",
        cascade: cascadeIndex,
        removed,
        scoreGain,
        goalDelta,
      });

      const { drops, spawns } = collapseBoard(this.state.board, this.rows, this.cols, () => this.createTile());
      effects.steps.push({
        type: "drop",
        cascade: cascadeIndex,
        drops,
        spawns,
      });
    }

    effects.comboCount = cascadeIndex;
    effects.scoreDelta = totalScoreDelta;
    effects.goalDelta = totalGoalDelta;

    if (!hasPossibleMove(this.state.board, this.matchMin)) {
      this.state.board = shuffleBoardKinds(
        this.state.board,
        (kind) => this.createTile(kind),
        (board) => findMatches(board, this.matchMin),
        (board) => hasPossibleMove(board, this.matchMin),
      );
      effects.steps.push({
        type: "reshuffle",
        board: boardToSnapshot(this.state.board),
      });
      effects.reshuffled = true;
    }

    if (isGoalComplete(this.state.goal)) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.overlay = createOverlay("YOU WIN", `目标已完成，准备进入 LEVEL ${this.levelIndex + 1}。`, "下一关");
      this.state.overlay.visible = true;
      this.state.message = cascadeIndex > 1 ? `连锁 x${cascadeIndex}，目标完成！` : "目标完成！";
    } else if (this.state.movesRemaining <= 0) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.overlay = createOverlay("GAME OVER", `步数已用尽，未完成目标。将从 LEVEL ${this.initialLevelIndex} 重新开始。`, "重新开始");
      this.state.overlay.visible = true;
      this.state.message = "步数耗尽";
    } else {
      this.state.message = cascadeIndex > 1 ? `Cascade x${cascadeIndex}` : "Nice Match!";
    }

    this.state.effects = effects;
    this.notify();
  }

  resetGame(emit = true, options = {}) {
    this.random = createSeededRandom(this.seed);
    this.state = this.createEmptyState(options);
    this.state.board = createInitialBoard(
      this.rows,
      this.cols,
      this.activeTileDefs.map((item) => item.id),
      (kind) => this.createTile(kind),
      (board) => findMatches(board, this.matchMin),
      (board) => hasPossibleMove(board, this.matchMin),
    );
    if (emit) this.notify();
  }

  createTile(kind) {
    const tileKind = kind ?? this.pickRandomKind();
    return {
      id: `tile-${this.tileSerial++}`,
      kind: tileKind,
    };
  }

  pickRandomKind() {
    const defs = this.activeTileDefs;
    const index = Math.floor(this.random() * defs.length);
    return defs[index]?.id ?? defs[0]?.id ?? "happy";
  }

  buildGoalsForLevel(levelIndex) {
    const defs = this.activeTileDefs.filter((item) => item?.id);
    if (defs.length === 0) {
      return [this.goalTemplate];
    }

    if (levelIndex <= 1 && this.goalTemplate?.tileId) {
      return [
        {
          type: this.goalTemplate.type ?? "collect",
          tileId: this.goalTemplate.tileId,
          target: Math.max(1, Number(this.goalTemplate.target ?? 0)),
        },
      ];
    }

    const maxGoalCount = Math.min(defs.length, 4);
    const goalCount = levelIndex <= 1 ? 1 : Math.min(maxGoalCount, 2 + Math.floor((levelIndex - 2) / 2));
    const startOffset = Math.max(0, levelIndex - 1) % defs.length;
    const selectedDefs = [];

    for (let index = 0; index < defs.length && selectedDefs.length < goalCount; index += 1) {
      const candidate = defs[(startOffset + index) % defs.length];
      if (!candidate || selectedDefs.some((item) => item.id === candidate.id)) continue;
      selectedDefs.push(candidate);
    }

    const baseTarget = Math.max(4, Number(this.goalTemplate?.target ?? 12));
    const perGoalBase = goalCount === 1 ? baseTarget : Math.max(4, Math.round(baseTarget / Math.max(1, goalCount * 0.9)));

    return selectedDefs.map((item, index) => ({
      type: "collect",
      tileId: item.id,
      target: perGoalBase + ((levelIndex + index) % 3),
    }));
  }

  inBounds(row, col) {
    return row >= 0 && col >= 0 && row < this.rows && col < this.cols;
  }

  getSnapshot() {
    return {
      rows: this.rows,
      cols: this.cols,
      levelIndex: this.levelIndex,
      moveLimit: this.moveLimit,
      matchMin: this.matchMin,
      title: this.title,
      subtitle: this.subtitle,
      tileDefs: this.activeTileDefs.map((item) => ({ ...item })),
      goal: toGoalSnapshot(this.state.goal, this.tileDefsById),
      presentation: { ...this.presentation },
      colors: { ...this.colors },
      state: {
        board: boardToSnapshot(this.state.board),
        score: this.state.score,
        movesUsed: this.state.movesUsed,
        movesRemaining: this.state.movesRemaining,
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        message: this.state.message,
        overlay: { ...this.state.overlay },
        effects: {
          tick: this.state.effects.tick,
          invalidSwap: this.state.effects.invalidSwap ? { ...this.state.effects.invalidSwap } : null,
          swap: this.state.effects.swap ? { ...this.state.effects.swap } : null,
          steps: this.state.effects.steps.map((step) => ({
            ...step,
            removed: step.removed ? step.removed.map((item) => ({ ...item })) : undefined,
            drops: step.drops ? step.drops.map((item) => ({ ...item })) : undefined,
            spawns: step.spawns ? step.spawns.map((item) => ({ ...item })) : undefined,
            board: step.board ? boardToSnapshot(step.board) : undefined,
          })),
          comboCount: this.state.effects.comboCount,
          scoreDelta: this.state.effects.scoreDelta,
          goalDelta: this.state.effects.goalDelta,
          reshuffled: this.state.effects.reshuffled,
        },
      },
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
