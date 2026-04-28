import { SvgGridRenderer } from "./SvgGridRenderer.js";
import { SvgCellRenderer } from "./SvgCellRenderer.js";
import { SvgPathRenderer } from "./SvgPathRenderer.js";
import { SvgUIRenderer } from "./SvgUIRenderer.js";
import { InputSystem } from "../systems/InputSystem.js";
export class SvgGameRenderer {
  constructor(root, kernel) {
    this.root = root;
    this.kernel = kernel;
    this.snapshot = kernel.getSnapshot();
    this.unsubscribe = null;
    this.lastRunTick = -1;
    this.lastBlockedTick = -1;
    this.pendingRunId = null;
    this.musicPlayer = null;
    this.activeMusicUrl = "";
    this.unblockPlayer = null;
    this.activeUnblockSoundUrl = "";
  }

  async mount() {
    ensureRendererStyles();
    this.root.innerHTML = "";
    this.root.className = "svg-game-root";
    this.preventTouchMove = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener("touchmove", this.preventTouchMove, { passive: false });

    this.wrapper = document.createElement("div");
    this.wrapper.className = "svg-game-shell";
    this.root.appendChild(this.wrapper);

    this.boardArea = document.createElement("div");
    this.boardArea.className = "svg-board-area";
    this.wrapper.appendChild(this.boardArea);

    this.uiLayer = document.createElement("div");
    this.wrapper.appendChild(this.uiLayer);

    this.musicPlayer = new Audio();
    this.musicPlayer.loop = true;
    this.musicPlayer.preload = "auto";
    this.musicPlayer.volume = 0.65;

    this.unblockPlayer = new Audio();
    this.unblockPlayer.loop = false;
    this.unblockPlayer.preload = "auto";
    this.unblockPlayer.volume = 0.85;

    this.gridRenderer = new SvgGridRenderer(this.snapshot.board, this.snapshot.theme);
    this.boardArea.appendChild(this.gridRenderer.root);

    this.cellRenderer = new SvgCellRenderer(this.gridRenderer.cellLayer, this.snapshot.board, this.snapshot.theme);
    this.pathRenderer = new SvgPathRenderer(
      this.gridRenderer.svg,
      this.gridRenderer.pathLayer,
      this.gridRenderer.effectLayer,
      {
        ...this.snapshot.board,
        stepDurationMs: this.snapshot.board.stepDurationMs,
        pathStrokeWidth: this.snapshot.board.pathStrokeWidth,
        indicatorRadius: this.snapshot.board.indicatorRadius,
      },
      {
        primary: this.snapshot.theme.primary,
        pathGlow: this.snapshot.theme.pathGlow,
        indicator: this.snapshot.theme.indicator,
        success: this.snapshot.theme.success,
      },
    );
    this.uiRenderer = new SvgUIRenderer(this.uiLayer, {
      onRestart: () => this.kernel.dispatch({ type: "restart" }),
      onOverlayAction: () => {
        this.kernel.dispatch({ type: "start_or_restart" });
        void this.musicPlayer?.play?.().catch(() => {});
      },
    });

    this.inputSystem = new InputSystem(this.gridRenderer.svg, {
      onWormPointerDown: (worm) => this.kernel.dispatch({
        type: "trigger_worm",
        wormId: worm.id,
        position: { x: worm.x, y: worm.y },
      }),
    });
    this.inputSystem.attach();

    this.unsubscribe = this.kernel.subscribe((nextSnapshot) => {
      this.snapshot = nextSnapshot;
      void this.render(nextSnapshot);
    });

    await this.render(this.snapshot);
  }

  async render(snapshot) {
    const backgroundColor = snapshot.theme.background || snapshot.theme.backgroundTop || "#ffffff";
    const backgroundImage = snapshot.theme.backgroundImage || "";
    this.root.style.backgroundColor = backgroundColor;
    this.root.style.backgroundImage = backgroundImage ? `url("${backgroundImage}")` : "none";
    this.root.style.backgroundPosition = snapshot.theme.backgroundPosition || "center";
    this.root.style.backgroundRepeat = snapshot.theme.backgroundRepeat || "no-repeat";
    this.root.style.backgroundSize = snapshot.theme.backgroundSize || "cover";
    this.syncBackgroundMusic(snapshot.audio || {});
    this.syncSoundEffects(snapshot.audio || {});
    this.gridRenderer.theme = snapshot.theme;
    this.gridRenderer.board = snapshot.board;
    this.gridRenderer.buildDefs();
    this.gridRenderer.renderBoard();

    this.cellRenderer.board = snapshot.board;
    this.cellRenderer.theme = snapshot.theme;
    this.cellRenderer.render(snapshot.board, snapshot.state);
    this.pathRenderer.board = snapshot.board;
    this.pathRenderer.theme = {
      primary: snapshot.theme.primary,
      pathGlow: snapshot.theme.pathGlow,
      indicator: snapshot.theme.indicator,
      success: snapshot.theme.success,
    };
    this.uiRenderer.render(snapshot);

    const effectTick = snapshot.state.effects?.tick ?? -1;
    const run = snapshot.state.effects?.run;
    const blocked = snapshot.state.effects?.blocked;
    this.pathRenderer.sync(snapshot.worms, snapshot.state);
    if (blocked && effectTick > this.lastBlockedTick) {
      this.pathRenderer.playBlockedFeedback(blocked.wormId, this.boardArea);
      this.lastBlockedTick = effectTick;
    }
    if (run && effectTick > this.lastRunTick && this.pendingRunId !== run.id) {
      this.pendingRunId = run.id;
      this.playUnblockSound();
      await this.pathRenderer.playRun(run, snapshot.worms, this.cellRenderer, this.boardArea);
      this.lastRunTick = effectTick;
      this.pendingRunId = null;
      this.kernel.dispatch({ type: "complete_run", runId: run.id });
      return;
    }

    this.lastRunTick = Math.max(this.lastRunTick, effectTick);
    this.lastBlockedTick = Math.max(this.lastBlockedTick, effectTick);
  }

  destroy() {
    this.unsubscribe?.();
    this.inputSystem?.detach();
    this.musicPlayer?.pause();
    this.unblockPlayer?.pause();
    if (this.preventTouchMove) {
      document.removeEventListener("touchmove", this.preventTouchMove);
    }
  }

  syncBackgroundMusic(audioConfig = {}) {
    if (!this.musicPlayer) return;
    const nextUrl = audioConfig.backgroundMusic || "";
    const nextVolume = Number.isFinite(Number(audioConfig.musicVolume)) ? Number(audioConfig.musicVolume) : 0.65;
    const shouldLoop = audioConfig.musicLoop !== false;
    this.musicPlayer.loop = shouldLoop;
    this.musicPlayer.volume = Math.max(0, Math.min(1, nextVolume));

    if (!nextUrl) {
      this.activeMusicUrl = "";
      this.musicPlayer.pause();
      this.musicPlayer.removeAttribute("src");
      return;
    }

    if (this.activeMusicUrl !== nextUrl) {
      this.activeMusicUrl = nextUrl;
      this.musicPlayer.src = nextUrl;
      this.musicPlayer.currentTime = 0;
    }

    if (this.musicPlayer.paused) {
      void this.musicPlayer.play().catch(() => {});
    }
  }

  syncSoundEffects(audioConfig = {}) {
    if (!this.unblockPlayer) return;
    const nextUrl = audioConfig.unblockSound || "";
    const nextVolume = Number.isFinite(Number(audioConfig.unblockVolume)) ? Number(audioConfig.unblockVolume) : 0.85;
    this.unblockPlayer.volume = Math.max(0, Math.min(1, nextVolume));

    if (!nextUrl) {
      this.activeUnblockSoundUrl = "";
      this.unblockPlayer.pause();
      this.unblockPlayer.removeAttribute("src");
      return;
    }

    if (this.activeUnblockSoundUrl !== nextUrl) {
      this.activeUnblockSoundUrl = nextUrl;
      this.unblockPlayer.src = nextUrl;
      this.unblockPlayer.load();
    }
  }

  playUnblockSound() {
    if (!this.unblockPlayer || !this.activeUnblockSoundUrl) return;
    this.unblockPlayer.currentTime = 0;
    void this.unblockPlayer.play().catch(() => {});
  }
}

function ensureRendererStyles(doc = document) {
  if (doc.getElementById("svg-game-renderer-styles")) return;
  const style = doc.createElement("style");
  style.id = "svg-game-renderer-styles";
  style.textContent = `
    .svg-game-root {
      width: 100%;
      height: 100%;
      overflow: hidden;
      color: #f8fafc;
      font-family: Arial, sans-serif;
      touch-action: none;
    }

    .svg-game-shell {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 0;
      box-sizing: border-box;
      overflow: hidden;
    }

    .svg-board-area {
      position: relative;
      width: min(98vw, 1560px);
      min-height: calc(100dvh - 48px);
      display: grid;
      place-items: center;
      margin-top: 36px;
      padding: 14px 0 34px;
      background: transparent;
    }

    .svg-board-frame {
      width: auto;
      max-width: min(98vw, 1560px);
      max-height: calc(100dvh - 130px);
      display: grid;
      place-items: center;
    }

    .game-board {
      width: auto;
      max-width: min(98vw, 1560px);
      height: min(calc(100dvh - 148px), 1180px);
      max-height: calc(100dvh - 148px);
      display: block;
      touch-action: none;
      user-select: none;
    }

    .worm-instance {
      transition: opacity 180ms ease;
    }

    .worm-instance .worm-base {
      filter: saturate(1.08) brightness(1.08);
      transition: filter 180ms ease, opacity 180ms ease;
    }

    .worm-instance .worm-highlight {
      opacity: 0;
      transition: opacity 180ms ease;
    }

    #ui-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      color: var(--svg-text, #f8fafc);
      z-index: 2;
    }

    .svg-ui-hud {
      position: absolute;
      top: 36px;
      left: 50%;
      transform: translateX(-50%);
      width: min(760px, calc(100% - 36px));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .svg-ui-card {
      border-radius: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
      backdrop-filter: none;
      box-sizing: border-box;
    }

    .svg-ui-overlay-panel {
      border-radius: 20px;
      background: var(--svg-panel, rgba(255,255,255,0.96));
      border: 1px solid var(--svg-panel-border, rgba(15,23,42,0.12));
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
      backdrop-filter: none;
      box-sizing: border-box;
    }

    .svg-ui-title-card {
      text-align: center;
      flex: 1 1 auto;
    }

    .svg-ui-title-card {
      padding: 10px 16px;
      pointer-events: none;
    }

    .svg-ui-hud-compact {
      width: min(760px, 100%);
    }

    .svg-ui-subtitle,
    .svg-ui-overlay-kicker,
    .svg-ui-overlay-body {
      color: var(--svg-muted, #9db3c8);
    }

    .svg-ui-overlay-kicker,
    .svg-ui-subtitle {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
    }

    .svg-ui-overlay-kicker {
      display: none;
    }

    .svg-ui-title,
    .svg-ui-overlay-title {
      font-size: clamp(28px, 4vw, 42px);
      font-weight: 900;
      line-height: 1;
    }

    .svg-ui-subtitle,
    .svg-ui-overlay-body {
      font-size: 14px;
      line-height: 1.6;
    }

    .svg-pill-button {
      pointer-events: auto;
      align-self: center;
      justify-self: center;
      border: 1.5px solid rgba(15, 23, 42, 0.22);
      border-radius: 999px;
      padding: 13px 24px;
      font-size: 14px;
      font-weight: 800;
      background: rgba(255,255,255,0.92);
      color: var(--svg-text, #f8fafc);
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      transition: transform 140ms ease, filter 140ms ease, opacity 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease;
    }

    .svg-pill-button:hover {
      filter: brightness(1.02);
      border-color: rgba(15, 23, 42, 0.32);
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
    }

    .svg-pill-button:active {
      transform: translateY(2px) scale(0.97);
      background: rgba(241, 245, 249, 0.96);
      border-color: rgba(15, 23, 42, 0.4);
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
    }

    .svg-pill-button:focus-visible {
      outline: none;
      border-color: rgba(37, 99, 235, 0.42);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16);
    }

    .svg-pill-button:disabled { opacity: 0.55; cursor: default; }

    .svg-ui-overlay {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(7, 17, 31, 0.72);
      backdrop-filter: none;
      pointer-events: none;
    }

    .svg-ui-overlay.is-visible {
      display: flex;
    }

    .svg-ui-overlay-panel {
      width: min(460px, calc(100vw - 32px));
      min-height: 250px;
      padding: 28px 26px 30px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
      pointer-events: auto;
      text-align: center;
    }

    @media (max-width: 920px) {
      .svg-ui-hud {
        width: calc(100% - 24px);
        top: 36px;
      }

      .svg-board-area {
        width: min(100vw, 1040px);
        min-height: calc(100dvh - 42px);
        margin-top: 56px;
        padding-bottom: 18px;
      }

      .svg-board-frame {
        max-width: 100vw;
        max-height: calc(100dvh - 132px);
      }

      .game-board {
        max-width: 100vw;
        height: min(calc(100dvh - 150px), 980px);
        max-height: calc(100dvh - 150px);
      }
    }
  `;
  doc.head.appendChild(style);
}
