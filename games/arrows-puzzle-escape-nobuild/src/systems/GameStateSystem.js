export class GameStateSystem {
  constructor(uiConfig = {}) {
    this.uiConfig = uiConfig;
  }

  createInitialState(levelInfo) {
    return {
      status: "idle",
      currentPath: [],
      visited: new Set(),
      activeCell: null,
      attempts: 0,
      lastRun: null,
      removedWormIds: new Set(),
      blockedWormIds: new Set(),
      occupancy: [],
      message: this.uiConfig.statusIdle || "选择最上层虫子开始。",
      overlay: this.createOverlay("start", levelInfo),
      effects: {
        tick: 0,
        run: null,
        blocked: null,
      },
    };
  }

  createOverlay(kind, levelInfo) {
    if (kind === "success") {
      return {
        visible: true,
        kind,
        title: levelInfo?.successTitle || this.uiConfig.successTitle || "Success",
        body: levelInfo?.successBody || this.uiConfig.successBody || "",
        buttonText: levelInfo?.successButtonText || this.uiConfig.successButton || "Play again",
      };
    }
    if (kind === "failed") {
      return {
        visible: true,
        kind,
        title: this.uiConfig.failedTitle || "Failed",
        body: this.uiConfig.failedBody || "",
        buttonText: this.uiConfig.failedButton || "Retry",
      };
    }
    return {
      visible: true,
      kind: "start",
      title: levelInfo?.name || this.uiConfig.startTitle || "Start",
      body: levelInfo?.description || this.uiConfig.startBody || "",
      buttonText: this.uiConfig.startButton || "Start",
    };
  }

  resetState(levelInfo, effectTick = 0) {
    const state = this.createInitialState(levelInfo);
    state.effects.tick = effectTick;
    return state;
  }

  beginPlay(state) {
    state.status = "idle";
    state.overlay.visible = false;
    state.message = this.uiConfig.statusIdle || "选择最上层虫子开始。";
  }

  canTrigger(state) {
    return state.status !== "running" && !state.overlay?.visible;
  }

  applyDerivedState(state, derivedData) {
    state.blockedWormIds = new Set(derivedData.blockedIds);
    state.occupancy = derivedData.occupancy;
  }

  applyBlockedAttempt(state, wormId, effectTick) {
    state.message = this.uiConfig.statusBlocked || "这条虫子被压住了，先移开上层虫子。";
    state.effects = {
      tick: effectTick,
      run: null,
      blocked: {
        wormId,
      },
    };
  }

  applyRunStart(state, run, effectTick) {
    state.status = "running";
    state.currentPath = run.path.map((point) => ({ ...point }));
    state.visited = new Set(run.path.map((point) => `${point.x},${point.y}`));
    state.activeCell = run.start ? { ...run.start } : null;
    state.message = this.uiConfig.statusRunning || "虫子回退中...";
    state.effects = {
      tick: effectTick,
      run,
      blocked: null,
    };
  }

  applyRunResult(state, run, effectTick, levelInfo, solved = false) {
    state.attempts += 1;
    state.currentPath = [];
    state.visited = new Set();
    state.activeCell = null;
    state.lastRun = run;
    state.effects = {
      tick: effectTick,
      run: null,
      blocked: null,
    };

    if (solved) {
      state.status = "success";
      state.message = this.uiConfig.statusSuccess || "所有虫子都已消除。";
      state.overlay = this.createOverlay("success", levelInfo);
      return;
    }

    state.status = "idle";
    state.message = this.uiConfig.statusIdle || "选择最上层虫子开始。";
    state.overlay.visible = false;
  }
}
