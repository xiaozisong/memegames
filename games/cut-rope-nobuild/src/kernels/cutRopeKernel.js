import { buildLevels, getPresentationAssets, getPresentationAudio, getSetting } from "../config.js";
import { createOverlay } from "../core/contracts.js";
import { collectTouchedStars, isCandyInsideTarget, isCandyOutOfBounds } from "./systems/collisionSystem.js";
import { createLevelState, getLevelByIndex } from "./systems/levelSystem.js";
import { stepCandyPhysics } from "./systems/physicsSystem.js";

export class CutRopeKernel {
  constructor() {
    this.id = "cut_rope";
    this.listeners = [];
    this.eventTick = 0;

    this.world = {
      width: Number(getSetting("gameplay_world_width", 1000)),
      height: Number(getSetting("gameplay_world_height", 1600)),
    };
    this.initialLevelIndex = Math.max(1, Number(getSetting("gameplay_level_index", 1)));
    this.levels = buildLevels();
    this.totalLevels = Math.max(1, this.levels.length, Number(getSetting("gameplay_level_count", 1)));
    this.candyRadius = Number(getSetting("gameplay_candy_radius", 42));
    this.starRadius = Number(getSetting("gameplay_star_radius", 24));
    this.targetPadding = Number(getSetting("gameplay_target_padding", 18));
    this.failMargin = Number(getSetting("gameplay_fail_margin", 180));

    this.physics = {
      gravity: Number(getSetting("gameplay_gravity", 1780)),
      airDrag: Number(getSetting("gameplay_air_drag", 0.06)),
      attachedDamping: Number(getSetting("gameplay_attached_damping", 0.14)),
      swayForce: Number(getSetting("gameplay_sway_force", 240)),
      swayFrequency: Number(getSetting("gameplay_sway_frequency", 0.55)),
      constraintIterations: Number(getSetting("gameplay_constraint_iterations", 4)),
    };

    this.title = getSetting("presentation_hud_title", "CUT THE ROPE");
    this.subtitle = getSetting("presentation_hud_subtitle", "切断绳索，让糖果落入接收口。");
    this.colors = {
      bgTop: getSetting("theme_bg_top", "#10182f"),
      bgBottom: getSetting("theme_bg_bottom", "#1f345f"),
      cardBg: getSetting("theme_card_bg", "#08111f"),
      cardBorder: getSetting("theme_card_border", "#6ad8ff"),
      textPrimary: getSetting("theme_text_primary", "#f4f9ff"),
      textSecondary: getSetting("theme_text_secondary", "#b5caef"),
      accent: getSetting("theme_accent", "#7ce8ff"),
      candyFill: getSetting("theme_candy_fill", "#ff7fb6"),
      candyGlow: getSetting("theme_candy_glow", "#ffd7ea"),
      rope: getSetting("theme_rope", "#f3ddb0"),
      ropeHover: getSetting("theme_rope_hover", "#7ce8ff"),
      ropeCut: getSetting("theme_rope_cut", "#6e88a8"),
      starFill: getSetting("theme_star_fill", "#ffd24d"),
      targetFill: getSetting("theme_target_fill", "#7bf59f"),
      targetActive: getSetting("theme_target_active", "#fef08a"),
      buttonBg: getSetting("theme_button_bg", "#7ce8ff"),
      buttonText: getSetting("theme_button_text", "#082033"),
      overlayMask: getSetting("theme_overlay_mask", "#030712"),
    };
    this.presentation = {
      ropeWidth: Number(getSetting("presentation_rope_width", 8)),
      ropeHoverWidth: Number(getSetting("presentation_rope_hover_width", 11)),
      sceneShadowAlpha: Number(getSetting("presentation_scene_shadow_alpha", 0.24)),
      restartButtonText: getSetting("presentation_restart_button_text", "Restart"),
      assets: getPresentationAssets(),
      audio: getPresentationAudio(),
    };

    this.state = this.createState(this.initialLevelIndex, { showOverlay: true, started: false });
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

    if (action.type === "start_or_continue") {
      this.handleStartOrContinue();
      return;
    }

    if (action.type === "restart_level") {
      this.restartCurrentLevel();
      return;
    }

    if (action.type === "cut_rope") {
      this.cutRope(action.ropeId);
      return;
    }

    if (action.type === "tick") {
      this.tick(Number(action.dt ?? 0));
    }
  }

  handleStartOrContinue() {
    if (this.state.isOver) {
      if (this.state.didWin) {
        const nextLevelIndex = this.state.level.index >= this.totalLevels ? 1 : this.state.level.index + 1;
        const showOverlay = false;
        this.state = this.createState(nextLevelIndex, { showOverlay, started: true });
      } else {
        this.state = this.createState(this.state.level.index, { showOverlay: false, started: true });
      }
      this.notify();
      return;
    }

    this.state.started = true;
    this.state.overlay.visible = false;
    this.state.message = "点击高亮绳索切断，让糖果落向目标。";
    this.notify();
  }

  restartCurrentLevel() {
    this.state = this.createState(this.state.level.index, { showOverlay: false, started: true });
    this.notify();
  }

  cutRope(ropeId) {
    if (!this.state.started || this.state.isOver || !ropeId) return;
    const rope = this.state.ropes.find((item) => item.id === ropeId && item.active);
    if (!rope) return;
    rope.active = false;
    this.state.effects = {
      tick: ++this.eventTick,
      lastCutRopeId: rope.id,
      collectedStarIds: [],
    };
    this.state.message = this.activeRopeCount() > 0 ? "继续切断绳索，调整落点。" : "糖果已脱离所有绳索。";
    this.notify();
  }

  tick(dt) {
    if (!this.state.started || this.state.isOver || !this.state.candy) return;
    const safeDt = clamp(dt, 0.001, 1 / 20);
    this.state.elapsed += safeDt;
    stepCandyPhysics(this.state, this.physics, safeDt, this.state.elapsed);

    const collectedStarIds = collectTouchedStars(this.state.candy, this.state.stars);
    if (collectedStarIds.length > 0) {
      this.state.collectedStars += collectedStarIds.length;
      this.state.score += collectedStarIds.length * 100;
      this.state.message = `收集星星 ${this.state.collectedStars}/${this.state.totalStars}`;
      this.state.effects = {
        tick: ++this.eventTick,
        lastCutRopeId: null,
        collectedStarIds,
      };
    }

    if (isCandyInsideTarget(this.state.candy, this.state.target, this.targetPadding)) {
      this.state.isOver = true;
      this.state.didWin = true;
      this.state.message = `通关成功，收集 ${this.state.collectedStars}/${this.state.totalStars} 颗星星。`;
      const isLastLevel = this.state.level.index >= this.totalLevels;
      this.state.overlay = createOverlay(
        isLastLevel ? "ALL CLEAR" : "太棒了",
        isLastLevel ? "所有示例关卡已完成，点击可重新从第一关开始。" : "糖果成功进入接收口，点击进入下一关。",
        isLastLevel ? "重新开始" : "下一关",
      );
      this.state.overlay.visible = true;
      this.notify();
      return;
    }

    if (isCandyOutOfBounds(this.state.candy, this.world, this.failMargin)) {
      this.state.isOver = true;
      this.state.didWin = false;
      this.state.message = "糖果掉出场景，挑战失败。";
      this.state.overlay = createOverlay("TRY AGAIN", "糖果没有进入接收口，点击立即重试本关。", "重新挑战");
      this.state.overlay.visible = true;
      this.notify();
      return;
    }

    this.notify();
  }

  createState(levelIndex, options = {}) {
    const showOverlay = options.showOverlay ?? true;
    const started = options.started ?? false;
    const level = getLevelByIndex(this.levels, levelIndex);
    const runtimeState = createLevelState(level, {
      candyRadius: this.candyRadius,
      starRadius: this.starRadius,
      worldWidth: this.world.width,
      worldHeight: this.world.height,
    });
    const overlay = createOverlay(
      getSetting("presentation_overlay_title", "Cut Rope"),
      getSetting("presentation_overlay_body", "点击高亮绳索将其切断。糖果会在重力和惯性下移动。"),
      getSetting("presentation_overlay_button_text", "开始游戏"),
    );
    overlay.visible = showOverlay;

    return {
      ...runtimeState,
      started,
      isOver: false,
      didWin: false,
      elapsed: 0,
      score: 0,
      message: started ? "关卡已重置，继续切绳。" : "点击开始，观察摆动后再切绳。",
      overlay,
      effects: {
        tick: ++this.eventTick,
        lastCutRopeId: null,
        collectedStarIds: [],
      },
    };
  }

  activeRopeCount() {
    return this.state.ropes.filter((item) => item.active).length;
  }

  getSnapshot() {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      totalLevels: this.totalLevels,
      world: { ...this.world },
      colors: { ...this.colors },
      presentation: {
        ...this.presentation,
        assets: cloneAssetSet(this.presentation.assets),
        audio: cloneAudioConfig(this.presentation.audio),
      },
      physics: { ...this.physics },
      state: {
        started: this.state.started,
        isOver: this.state.isOver,
        didWin: this.state.didWin,
        elapsed: this.state.elapsed,
        score: this.state.score,
        message: this.state.message,
        overlay: { ...this.state.overlay },
        effects: {
          tick: this.state.effects.tick,
          lastCutRopeId: this.state.effects.lastCutRopeId,
          collectedStarIds: [...this.state.effects.collectedStarIds],
        },
        level: {
          ...this.state.level,
          assets: cloneAssetSet(this.state.level.assets),
          audio: cloneAudioConfig(this.state.level.audio),
        },
        candy: this.state.candy
          ? {
              x: this.state.candy.x,
              y: this.state.candy.y,
              vx: this.state.candy.vx,
              vy: this.state.candy.vy,
              radius: this.state.candy.radius,
              rotation: this.state.candy.rotation,
              angularVelocity: this.state.candy.angularVelocity,
            }
          : null,
        ropes: this.state.ropes.map((rope) => ({
          id: rope.id,
          anchor: { ...rope.anchor },
          length: rope.length,
          active: rope.active,
        })),
        stars: this.state.stars.map((star) => ({
          id: star.id,
          x: star.x,
          y: star.y,
          radius: star.radius,
          collected: star.collected,
        })),
        target: this.state.target ? { ...this.state.target } : null,
        collectedStars: this.state.collectedStars,
        totalStars: this.state.totalStars,
        activeRopes: this.activeRopeCount(),
      },
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function cloneAssetSet(assets = {}) {
  return {
    background: { url: normalizeAssetUrl(assets.background?.url) },
    candy: { url: normalizeAssetUrl(assets.candy?.url) },
    star: { url: normalizeAssetUrl(assets.star?.url) },
    target: { url: normalizeAssetUrl(assets.target?.url) },
  };
}

function cloneAudioConfig(audio = {}) {
  return {
    bgmUrl: normalizeAssetUrl(audio.bgmUrl),
    bgmVolume: clamp(Number(audio.bgmVolume ?? 0.5), 0, 1),
    bgmLoop: typeof audio.bgmLoop === "boolean" ? audio.bgmLoop : true,
  };
}

function normalizeAssetUrl(value) {
  return String(value ?? "").trim();
}
